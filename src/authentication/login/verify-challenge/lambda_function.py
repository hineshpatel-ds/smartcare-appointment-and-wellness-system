import hashlib


def _hash(text):
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()


def lambda_handler(event, context):
    req      = event["request"]
    answer   = (req.get("challengeAnswer") or "").strip()
    params   = req["privateChallengeParameters"]
    ctype    = params.get("type")
    expected = params.get("expected", "")
    if ctype == "QA":
        correct = _hash(answer) == expected
    else:
        correct = answer.upper() == expected.upper()
    event["response"]["answerCorrect"] = correct
    return event
