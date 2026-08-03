# SAWS API Contract — Sprint 2

Shared source of truth for every HTTP endpoint in SmartCare Appointment and Wellness System (SAWS).
Backend and frontend build against this document instead of each other's code.
If an endpoint's shape changes, update this file in the same merge request as the code change.

## Conventions

- Base URL (AWS side): `https://api.saws.example/v1`
- Base URL (GCP side, Messaging module): `https://<region>-<project>.cloudfunctions.net`
- Base URL (local dev, analytics): `http://localhost:4000/api`
- Auth: `Authorization: Bearer <Cognito ID token>` on every endpoint marked "Patient" or "Coordinator". Endpoints marked "Guest" require no token.
- All request/response bodies are JSON. `Content-Type: application/json`.
- Timestamps are ISO 8601 UTC strings, e.g. `2026-07-07T21:22:16.851Z`.
- IDs are strings.

### Standard error shape

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Validation failure (missing/invalid fields) |
| 401 | Missing or invalid auth token |
| 403 | Authenticated but not permitted (role-based) |
| 404 | Resource not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Unhandled server error |

---

## Auth (proposed — owned by Member 1)

### `POST /auth/register`
```json
// Request
{ "fullName": "string", "email": "string", "password": "string", "role": "PATIENT" }
// 201 Response
{ "userId": "string", "email": "string", "role": "PATIENT" }
```

### `POST /auth/login`
```json
// Request
{ "email": "string", "password": "string" }
// 200 Response — first factor only
{ "sessionToken": "string", "nextStep": "SECURITY_QUESTION" }
```

### `POST /auth/verify-question`
```json
// Request
{ "sessionToken": "string", "answer": "string" }
// 200 Response
{ "sessionToken": "string", "nextStep": "CIPHER_CHALLENGE" }
```

### `POST /auth/verify-cipher`
```json
// Request
{ "sessionToken": "string", "answer": "string" }
// 200 Response — fully authenticated
{ "accessToken": "string", "userId": "string", "role": "PATIENT" }
```

---

## Appointments — **implemented** (Member 2, AWS Lambda + DynamoDB)

### `GET /appointments`
Query params: `usr_id` (optional — omit for admin view of all).
```json
// 200 Response
[{ "appt_id": "string", "usr_id": "string", "doc_id": "string", "srv_id": "string", "date": "YYYY-MM-DD", "time": "HH:MM", "sts": "PENDING", "created_at": "string" }]
```

### `POST /appointments`
```json
// Request
{ "usr_id": "string", "doc_id": "string", "srv_id": "string", "date": "YYYY-MM-DD", "time": "HH:MM" }
// 201 Response
{ "appt_id": "string", "usr_id": "string", "doc_id": "string", "srv_id": "string", "date": "string", "time": "string", "sts": "PENDING", "created_at": "string" }
```

### `PUT /appointments/{id}/status`
```json
// Request
{ "sts": "APPROVED" }
// 200 Response
{ "message": "Appointment status updated to APPROVED", "appt_id": "string" }
```
**Status enum:** `PENDING | APPROVED | REJECTED | CANCELLED`

---

## Doctors — **implemented** (Member 2, AWS Lambda + DynamoDB)

### `GET /doctors`
```json
// 200 Response
[{ "doc_id": "string", "name": "string", "specialty": "string", "active": true }]
```

### `POST /doctors`
```json
// Request
{ "name": "string", "specialty": "string" }
// 201 Response
{ "doc_id": "string", "name": "string", "specialty": "string", "active": true }
```

### `PUT /doctors/{id}`
```json
// Request (any subset of fields)
{ "name": "string", "specialty": "string", "active": false }
// 200 Response
{ "message": "Doctor updated", "doc_id": "string" }
```

---

## Healthcare Services — **implemented** (Member 2, AWS Lambda + DynamoDB)

### `GET /services`
```json
// 200 Response
[{ "srv_id": "string", "name": "string", "desc": "string", "price": 50.0, "active": true }]
```

### `POST /services`
```json
// Request
{ "name": "string", "price": 50.0, "desc": "string" }
// 201 Response
{ "srv_id": "string", "name": "string", "desc": "string", "price": 50.0, "active": true }
```

### `PUT /services/{id}`
```json
// Request (any subset of fields)
{ "name": "string", "price": 60.0, "active": false }
// 200 Response
{ "message": "Service updated", "srv_id": "string" }
```

---

## Messaging (GCP Pub/Sub + Cloud Functions + Firestore) — **implemented** (Member 3/4)

### `POST /messaging/concerns` — Patient
```json
// Request
{ "concernText": "I cannot find my appointment reference code." }
// 202 Response
{ "concernId": "concern_001", "status": "SUBMITTED" }
```

### `GET /messaging/concerns` — Patient (own), Coordinator (assigned)
```json
// 200 Response
{ "items": [{ "concernId": "string", "patientId": "string", "coordinatorId": "string", "concernText": "string", "responseText": "string", "status": "string", "createdAt": "string", "assignedAt": "string", "respondedAt": "string" }] }
```

### `PUT /messaging/concerns/{id}/respond` — Coordinator
```json
// Request
{ "responseText": "Your reference code is on the confirmation email." }
// 200 Response — updated log, status: "RESOLVED"
```

### Real-time chat
Not a REST endpoint. Both clients subscribe to `communication_logs/{concernId}/messages` in Firestore with `onSnapshot`.

---

## Notifications (AWS SNS/SQS + Lambda) — **implemented** (Member 3/4)

Notifications are fired internally by other modules publishing to an SNS topic.

### `GET /notifications/me` — Patient, Coordinator
```json
// 200 Response
{ "items": [{ "notificationId": "ntf_001", "type": "BOOKING", "message": "Your appointment is confirmed for 2026-06-15 14:00.", "createdAt": "string" }] }
```
**Type enum:** `REGISTRATION | LOGIN | BOOKING | CANCELLATION | REMINDER`

**Publishing contract for other modules:** publish to the shared SNS topic (`NOTIFICATIONS_TOPIC_ARN` env var):
```json
{ "type": "BOOKING", "userId": "user_123", "message": "Your appointment is confirmed." }
```

---

## Feedback — **implemented** (Member 5, Analytics backend)

### `GET /feedback`
```json
// 200 Response
[{ "feedbackId": "string", "patientId": "string", "serviceId": "string", "appointmentId": "string", "rating": 5, "comment": "string", "submittedAt": "string", "sentimentLabel": "POSITIVE", "sentimentScore": { "Positive": 0.7, "Negative": 0.1, "Neutral": 0.15, "Mixed": 0.05 }, "serviceName": "string" }]
```

### `POST /feedback`
```json
// Request
{ "patientId": "string", "serviceId": "string", "appointmentId": "string | null", "rating": 1, "comment": "string" }
// 201 Response — same shape as GET item, sentiment computed server-side
```

---

## Analytics — **implemented** (Member 5)

### `GET /analytics/kpis`
```json
{ "totalPatients": 10, "todaysLogins": 3, "totalAppointments": 20, "pendingAppointments": 2, "averageRating": 3.91, "positiveSentimentPercentage": 72.7 }
```

### `GET /analytics/appointment-trend`
```json
[ { "date": "2026-06-10", "count": 1 } ]
```

### `GET /analytics/appointment-status`
```json
[ { "status": "COMPLETED", "count": 13 } ]
```

### `GET /analytics/popular-services`
```json
[ { "serviceId": "string", "serviceName": "string", "count": 8 } ]
```

### `GET /analytics/sentiment-summary`
```json
[ { "label": "POSITIVE", "count": 7 } ]
```

### `GET /analytics/rating-by-service`
```json
[ { "serviceId": "string", "serviceName": "string", "averageRating": 4.5 } ]
```
