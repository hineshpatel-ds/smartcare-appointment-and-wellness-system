import boto3

REGION      = "us-east-1"
USERS_TABLE = "saws-users"
table = boto3.resource("dynamodb", region_name=REGION).Table(USERS_TABLE)


def _caesar(text, shift):
    out = ""
    for ch in text.upper():
        out += chr((ord(ch) - 65 + shift) % 26 + 65) if "A" <= ch <= "Z" else ch
    return out


def lambda_handler(event, context):
    username = event["userName"]
    session  = event["request"].get("session") or []
    done = len([s for s in session if s.get("challengeName") == "CUSTOM_CHALLENGE"])
    item = table.get_item(Key={"userId": username}).get("Item", {})
    if done == 0:
        event["response"]["publicChallengeParameters"]  = {"stage": "2", "question": item.get("securityQuestion", "")}
        event["response"]["privateChallengeParameters"] = {"type": "QA", "expected": item.get("securityAnswerHash", "")}
    else:
        base  = item.get("cipherBaseCode", "")
        shift = int(item.get("cipherShift", 0))
        event["response"]["publicChallengeParameters"]  = {"stage": "3", "clue": base}
        event["response"]["privateChallengeParameters"] = {"type": "CIPHER", "expected": _caesar(base, shift)}
    return event
