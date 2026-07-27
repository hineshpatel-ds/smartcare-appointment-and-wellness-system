# 3-Stage Login (Cognito Custom Authentication)

The login uses Cognito's custom authentication challenge flow, driven by three Lambda
triggers attached to the user pool. Stage 1 (password) is handled by Cognito; stages 2
and 3 are the custom challenges.

## The three Lambdas (attached as pool triggers)

| Cognito trigger | Lambda | Role |
|---|---|---|
| Define auth challenge | `saws-define-challenge` | Controller: decides the order (stage 2 -> stage 3 -> issue tokens), fails on any wrong answer |
| Create auth challenge | `saws-create-challenge` | Builds each challenge: reads the security question / cipher clue from `saws-users` and stashes the expected answer in private params |
| Verify auth challenge response | `saws-verify-challenge` | Checks the user's answer against the expected value (hash compare for the question, cipher compare for stage 3) |

Source:
- `src/authentication/login/define-challenge/lambda_function.py`
- `src/authentication/login/create-challenge/lambda_function.py`
- `src/authentication/login/verify-challenge/lambda_function.py`

## How the stages are told apart

`create-challenge` counts how many `CUSTOM_CHALLENGE` entries are already in the session:
0 done -> present the security question (type `QA`), otherwise -> present the Caesar
cipher (type `CIPHER`). It tags each challenge with that `type` in the private params, so
`verify-challenge` knows which check to run without depending on `challengeMetadata`
(which Cognito does not reliably pass through).

## Testing (CloudShell / AWS CLI)

Full login as `patient01` (security answer `Downtown Health`, cipher `CARE` shift 11 -> `NLCP`):

```bash
CLIENT=<app-client-id>; USER=patient01
S1=$(aws cognito-idp initiate-auth --auth-flow CUSTOM_AUTH --client-id $CLIENT \
     --auth-parameters USERNAME=$USER --region us-east-1 --query Session --output text)
S2=$(aws cognito-idp respond-to-auth-challenge --client-id $CLIENT \
     --challenge-name CUSTOM_CHALLENGE --session "$S1" \
     --challenge-responses USERNAME=$USER,ANSWER="Downtown Health" \
     --region us-east-1 --query Session --output text)
aws cognito-idp respond-to-auth-challenge --client-id $CLIENT \
     --challenge-name CUSTOM_CHALLENGE --session "$S2" \
     --challenge-responses USERNAME=$USER,ANSWER="NLCP" --region us-east-1
```

Successful result: an `AuthenticationResult` block with `AccessToken`, `IdToken`,
`RefreshToken` (ExpiresIn 3600, TokenType Bearer). A wrong answer at any stage returns
`NotAuthorizedException`.

## Test cases (Sprint 2 evidence)

| Test | Input | Expected |
|---|---|---|
| Successful login | correct password + `Downtown Health` + `NLCP` | tokens issued |
| Wrong security answer | correct password + wrong answer | NotAuthorized |
| Wrong cipher | correct password + `Downtown Health` + wrong code | NotAuthorized |

## Notes

- The cipher answer is per user (base code + shift stored in `saws-users`).
- Session strings from `initiate-auth` / `respond-to-auth-challenge` are single-use and
  short-lived; each stage must use the session returned by the previous call.