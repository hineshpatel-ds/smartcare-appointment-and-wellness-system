# Role-Based Access

Roles: `PATIENT` and `COORDINATOR` (guests are unauthenticated and have no account).

## How it works

1. **Signup** validates the role, creates the Cognito user, and adds them to the Cognito
   group that matches their role (`admin_add_user_to_group`). Two groups exist in the
   pool: `PATIENT` and `COORDINATOR`.
2. **Login** issues JWT tokens. Because the user is in a group, the ID/access token
   contains a `cognito:groups` claim, e.g. `"cognito:groups": ["COORDINATOR"]`.
3. **Protected APIs** read that claim to allow or deny. Coordinator-only actions (approve
   appointments, manage services, view analytics) check that `COORDINATOR` is present.

## Where the check happens

At the API layer. With API Gateway + a Cognito authorizer, the token is validated and its
claims (including `cognito:groups`) are made available to the backend Lambda, which does:

```python
groups = event["requestContext"]["authorizer"]["claims"].get("cognito:groups", "")
if "COORDINATOR" not in groups:
    return {"statusCode": 403, "body": "Coordinators only"}
```

(Exact shape depends on the authorizer type; documented here for the integration/frontend
team.)

## Tested

- `patient01` -> role PATIENT (created before group logic was added; add manually if needed)
- `coord01` -> role COORDINATOR, confirmed member of the COORDINATOR group in Cognito.