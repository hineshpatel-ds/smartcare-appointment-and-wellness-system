def lambda_handler(event, context):
    session = event["request"]["session"]

    if len(session) == 0:
        # first custom step -> ask the security question (stage 2)
        event["response"]["issueTokens"] = False
        event["response"]["failAuthentication"] = False
        event["response"]["challengeName"] = "CUSTOM_CHALLENGE"

    elif len(session) == 1 and session[-1]["challengeResult"]:
        # stage 2 passed -> ask the Caesar cipher (stage 3)
        event["response"]["issueTokens"] = False
        event["response"]["failAuthentication"] = False
        event["response"]["challengeName"] = "CUSTOM_CHALLENGE"

    elif len(session) == 2 and session[-1]["challengeResult"]:
        # stage 3 passed -> all stages done, issue tokens
        event["response"]["issueTokens"] = True
        event["response"]["failAuthentication"] = False

    else:
        # any wrong answer -> fail the login
        event["response"]["issueTokens"] = False
        event["response"]["failAuthentication"] = True

    return event