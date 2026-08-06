# SAWS API Contract

## Data models

### User

```json
{
  "userId": "patient1",
  "email": "patient1@example.com",
  "role": "patient",
  "securityQuestion": "What is your code word?",
  "healthcareCodeHint": "Apply Caesar shift 3 to your healthcare code clue.",
  "confirmationRequired": true
}
```

Roles are `patient` and `coordinator`.

### Service

```json
{
  "serviceId": "consultation-general",
  "name": "General Healthcare Consultation",
  "category": "Healthcare",
  "specialist": "Family Physician",
  "price": 65,
  "durationMinutes": 30,
  "availability": "Mon-Fri, 09:00-17:00",
  "description": "Routine consultation, symptoms review, and follow-up planning."
}
```

### Appointment

```json
{
  "appointmentId": "apt-...",
  "userId": "patient1",
  "service": "General Healthcare Consultation",
  "doctor": "Assigned coordinator",
  "date": "2026-08-20",
  "time": "10:30",
  "notes": "Initial visit",
  "status": "PENDING",
  "createdAt": "2026-08-04T00:00:00.000Z",
  "updatedAt": "2026-08-04T00:00:00.000Z"
}
```

Statuses are `PENDING`, `CONFIRMED`, `REJECTED`, and `CANCELLED`.

### Support message

```json
{
  "messageId": "msg-...",
  "userId": "patient1",
  "subject": "Reschedule request",
  "message": "I need help changing my appointment.",
  "assignedTo": null,
  "status": "OPEN",
  "replies": [],
  "createdAt": "2026-08-04T00:00:00.000Z",
  "updatedAt": "2026-08-04T00:00:00.000Z"
}
```

### Feedback

```json
{
  "feedbackId": "fb-...",
  "userId": "patient1",
  "service": "General Healthcare Consultation",
  "rating": 5,
  "comment": "The appointment was helpful and clear.",
  "sentimentScore": 0.4,
  "sentimentMagnitude": 0.55,
  "createdAt": "2026-08-04T00:00:00.000Z"
}
```

## Request examples

### Register

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "userId": "patient1",
  "email": "patient1@example.com",
  "password": "StrongPassword#123",
  "role": "patient",
  "securityQuestion": "What is your clinic code?",
  "securityAnswer": "blue",
  "healthcareCode": "CARE"
}
```

### Three-stage login

```json
POST /auth/login/start
{ "userId": "patient1", "password": "StrongPassword#123" }
```

```json
POST /auth/login/security-question
{ "userId": "patient1", "answer": "blue" }
```

```json
POST /auth/login/cipher
{ "userId": "patient1", "healthcareCode": "CARE" }
```

### Book appointment

```json
POST /appointments
{
  "userId": "patient1",
  "service": "General Healthcare Consultation",
  "date": "2026-08-20",
  "time": "10:30",
  "notes": "Initial consultation"
}
```

### Coordinator appointment decision

```json
PATCH /appointments/apt-123
{
  "status": "CONFIRMED",
  "userId": "coord1",
  "role": "coordinator"
}
```

### Analytics summary

```http
GET /analytics/summary?userId=patient1&role=patient
```

Patient response has `scope: patient` and only that user's records. Coordinator response has `scope: coordinator` and platform-level records.

## References

- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- HTTP response status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
- Express API reference: https://expressjs.com/en/4x/api.html
