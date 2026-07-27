import json
import os
import hashlib
import random
import string
import boto3

# ---- config (matches the Cognito + DynamoDB setup) ----
REGION       = "us-east-1"
USER_POOL_ID = "us-east-1_XOL4hRJA3"
CLIENT_ID    = "569v3tttnj2ibdr2hb6fjrkoh2"
USERS_TABLE  = "saws-users"

cognito = boto3.client("cognito-idp", region_name=REGION)
table   = boto3.resource("dynamodb", region_name=REGION).Table(USERS_TABLE)


def _hash(text):
    # store a hash of the security answer, never the plain text
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()


def _make_cipher():
    # pick a healthcare base code and a secret shift for stage 3
    base_codes = ["HEALTH", "CARE", "WELLNESS", "CLINIC", "MEDIC"]
    return random.choice(base_codes), random.randint(1, 25)


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    # accept body whether it comes from API Gateway (string) or a direct test (dict)
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body)

    username          = body.get("username")
    email             = body.get("email")
    password          = body.get("password")
    role              = body.get("role", "PATIENT").upper()
    security_question = body.get("securityQuestion")
    security_answer   = body.get("securityAnswer")

    # basic registration validation
    if not all([username, email, password, security_question, security_answer]):
        return _resp(400, {"message": "Missing required fields"})
    if role not in ("PATIENT", "COORDINATOR"):
        return _resp(400, {"message": "role must be PATIENT or COORDINATOR"})

    # 1) create the user in Cognito (stage 1 credentials)
    try:
        cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password,
            UserAttributes=[{"Name": "email", "Value": email}],
        )
        # auto-confirm so the user can log in right away (Learner Lab: no email step)
        cognito.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=username)
        # add the user to their role's Cognito group (role-based access)
        cognito.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName=role,
        )
    except cognito.exceptions.UsernameExistsException:
        return _resp(409, {"message": "Username already exists"})
    except cognito.exceptions.InvalidPasswordException as e:
        return _resp(400, {"message": "Password does not meet requirements", "detail": str(e)})
    except Exception as e:
        return _resp(500, {"message": "Cognito sign-up failed", "detail": str(e)})

    # 2) write the profile + stage 2/3 data to DynamoDB
    base_code, shift = _make_cipher()
    try:
        table.put_item(Item={
            "userId": username,
            "email": email,
            "role": role,
            "securityQuestion": security_question,
            "securityAnswerHash": _hash(security_answer),
            "cipherBaseCode": base_code,
            "cipherShift": shift,
            "createdAt": context.aws_request_id,
        })
    except Exception as e:
        return _resp(500, {"message": "Failed to store user profile", "detail": str(e)})

    # cipher hint returned once so the user knows their secret shift (demo/testing only)
    return _resp(201, {
        "message": "Registration successful",
        "username": username,
        "role": role,
        "cipherHint": f"Your stage-3 code = base '{base_code}' shifted by {shift}",
    })