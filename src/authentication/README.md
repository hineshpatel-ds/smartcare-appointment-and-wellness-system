# Authentication Module - AWS Setup Notes (Sprint 2)

These are the AWS resources the authentication module uses. Each teammate builds in
their own AWS account for now; at integration time these are recreated on the shared
account. Update the IDs below to match whatever account the module is deployed in.

## Config values (current build)

| Item | Value |
|---|---|
| Region | `us-east-1` |
| Cognito user pool | `saws-auth` -> pool id `us-east-1_XOL4hRJA3` |
| Cognito app client | `saws-auth-api` (public, no secret) -> client id `569v3tttnj2ibdr2hb6fjrkoh2` |
| DynamoDB table | `saws-users` (partition key: `userId`, String) |
| Lambda execution role | `LabRole` (AWS Academy Learner Lab constraint - IAM role creation is blocked) |

> When integrating on the shared account, only these five values change. They are set
> as constants at the top of each Lambda (`REGION`, `USER_POOL_ID`, `CLIENT_ID`,
> `USERS_TABLE`).

## Cognito app client settings that matter

The `saws-auth-api` client must have:
- No client secret (public client / SPA type)
- Authentication flows enabled: `ALLOW_CUSTOM_AUTH` (for the 3-stage login),
  `ALLOW_USER_PASSWORD_AUTH` (for testing), `ALLOW_REFRESH_TOKEN_AUTH`

`ALLOW_CUSTOM_AUTH` is required - the three-stage login is built with Cognito custom
authentication challenge Lambda triggers, not built-in MFA.

## Lambdas

| Lambda | Purpose | Status |
|---|---|---|
| `saws-signup` | Registration: create user in Cognito + write profile/security Q&A/cipher to DynamoDB | Done |
| (next) define/create/verify auth challenge | 3-stage login | In progress |

## saws-signup

Source: `src/authentication/signup/lambda_function.py`

What it does:
1. Validates the registration input.
2. Creates the user in Cognito (`sign_up`) and auto-confirms it (`admin_confirm_sign_up`)
   so there is no email-verification step in the lab.
3. Writes to `saws-users`: role, security question, a SHA-256 hash of the security answer
   (never the plain answer), a random Caesar-cipher base code and secret shift, and a
   timestamp.

Sample request body:

```json
{
  "username": "patient01",
  "email": "patient01@example.com",
  "password": "Passw0rd!23",
  "role": "PATIENT",
  "securityQuestion": "What is your favourite clinic?",
  "securityAnswer": "Downtown Health"
}
```

Tested result: `201 Registration successful`, user created in Cognito (Confirmed) and
item written to DynamoDB.

Note: the response currently returns a `cipherHint` for testing convenience. Remove this
before final submission so the stage-3 secret is not exposed.