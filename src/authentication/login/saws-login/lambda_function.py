import json
import boto3

REGION    = "us-east-1"
CLIENT_ID = "569v3tttnj2ibdr2hb6fjrkoh2"

cognito = boto3.client("cognito-idp", region_name=REGION)


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body)

    username        = body.get("username")
    security_answer = body.get("securityAnswer")
    cipher_answer   = body.get("cipherAnswer")

    if not all([username, security_answer, cipher_answer]):
        return _resp(400, {"message": "username, securityAnswer and cipherAnswer are required"})

    try:
        # start the custom auth flow
        r1 = cognito.initiate_auth(
            AuthFlow="CUSTOM_AUTH",
            ClientId=CLIENT_ID,
            AuthParameters={"USERNAME": username},
        )

        # stage 2: security question
        r2 = cognito.respond_to_auth_challenge(
            ClientId=CLIENT_ID,
            ChallengeName="CUSTOM_CHALLENGE",
            Session=r1["Session"],
            ChallengeResponses={"USERNAME": username, "ANSWER": security_answer},
        )
        if "Session" not in r2:
            return _resp(401, {"message": "Login failed at security question"})

        # stage 3: caesar cipher
        r3 = cognito.respond_to_auth_challenge(
            ClientId=CLIENT_ID,
            ChallengeName="CUSTOM_CHALLENGE",
            Session=r2["Session"],
            ChallengeResponses={"USERNAME": username, "ANSWER": cipher_answer},
        )

        if "AuthenticationResult" in r3:
            tokens = r3["AuthenticationResult"]
            return _resp(200, {
                "message": "Login successful",
                "idToken": tokens["IdToken"],
                "accessToken": tokens["AccessToken"],
                "refreshToken": tokens["RefreshToken"],
                "expiresIn": tokens["ExpiresIn"],
            })
        return _resp(401, {"message": "Login failed at cipher stage"})

    except cognito.exceptions.NotAuthorizedException:
        return _resp(401, {"message": "Incorrect username or answer"})
    except cognito.exceptions.UserNotFoundException:
        return _resp(404, {"message": "User not found"})
    except Exception as e:
        return _resp(500, {"message": "Login error", "detail": str(e)})