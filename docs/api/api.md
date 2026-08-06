# SAWS API Documentation

Base URL for the latest deployed backend:

```text
https://saws-api-474600405419.us-central1.run.app
```

For local development, the backend listens on:

```text
http://localhost:8080
```

## Authentication

SAWS uses a sequential three-stage login flow. The frontend stores the returned user object in local storage and sends `userId` and `role` as query/body context for protected project endpoints.

This project does not expose raw cloud-provider details in the UI. The backend owns Cognito, DynamoDB, Firestore, Pub/Sub, SNS/SQS, and Natural Language API integration.

## Public endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check for Cloud Run/API uptime. |
| `GET` | `/services` | Public list of healthcare and wellness services. |
| `POST` | `/chatbot` | Virtual assistant for navigation, pricing, appointment lookup, and support concerns. |
| `POST` | `/auth/register` | Register patient or coordinator account. |
| `POST` | `/auth/register/confirm` | Confirm Cognito registration code when required. |
| `POST` | `/auth/login/start` | Stage 1 login with user ID and password. |
| `POST` | `/auth/login/security-question` | Stage 2 security question validation. |
| `POST` | `/auth/login/cipher` | Stage 3 Caesar cipher healthcare code validation. |

## Protected patient/coordinator endpoints

| Method | Path | Context | Purpose |
|---|---|---|---|
| `POST` | `/appointments` | body `userId` | Book a future appointment. Past dates/times are rejected. |
| `GET` | `/appointments?userId={id}&role={role}` | query | Patient sees own history; coordinator sees all. |
| `PATCH` | `/appointments/{appointmentId}` | coordinator body | Approve/reject/cancel appointment. |
| `POST` | `/messages/support` | body `userId` optional | Submit support concern. |
| `GET` | `/messages?userId={id}&role={role}` | query | Patient sees own/guest messages; coordinator sees all. |
| `POST` | `/messages/{messageId}/reply` | coordinator body | Coordinator reply to a support request. |
| `POST` | `/feedback` | body `userId` | Submit service feedback and sentiment analysis. |
| `POST` | `/analyze` | body `text` | Analyze text sentiment. |
| `GET` | `/analytics/summary?userId={id}&role={role}` | query | Role-scoped analytics summary. |
| `POST` | `/services` | coordinator body | Add or update service offering. |
| `PUT` | `/services/{serviceId}` | coordinator body | Update service offering by ID. |

## Error model

Errors return JSON:

```json
{ "error": "message" }
```

Common statuses:

- `400` for invalid input, missing required fields, not found records, and past appointment slots.
- `401` for missing login context on protected read endpoints.
- `403` for coordinator-only actions attempted without coordinator context.
- `500` for unexpected cloud/runtime failures.

## References

- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- Express routing documentation: https://expressjs.com/en/guide/routing.html
- Google Cloud Run services: https://docs.cloud.google.com/run/docs/managing/services
