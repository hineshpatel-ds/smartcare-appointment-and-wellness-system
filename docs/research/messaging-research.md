# Messaging Module Research and Architecture

## Overview

The Messaging Module enables communication between patients and wellness coordinators within SAWS. Patients can submit concerns through the application or virtual assistant, and the system automatically assigns them to a coordinator. Communication records are stored for future reference, and the module supports both asynchronous messaging and real-time chat.

---

## Functional Requirements

| ID    | Requirement                                    |
| ----- | ---------------------------------------------- |
| MSG-1 | Patient submits a support concern              |
| MSG-2 | Concern is published to a Pub/Sub topic        |
| MSG-3 | System assigns concern to a random coordinator |
| MSG-4 | Communication log is stored                    |
| MSG-5 | Coordinator responds asynchronously            |
| MSG-6 | Patient receives notification                  |
| MSG-7 | Real-time patient–coordinator chat             |
| MSG-8 | Retry and dead-letter handling for failures    |

---

## Technology Evaluation

### Async Messaging

| Criteria               | GCP Pub/Sub        | AWS SNS/SQS   |
| ---------------------- | ------------------ | ------------- |
| Delivery Guarantee     | At-least-once      | At-least-once |
| Retry Support          | Built-in           | Built-in      |
| Dead-Letter Support    | Yes                | Yes           |
| Serverless Integration | Cloud Functions    | Lambda        |
| Spec Alignment         | Directly specified | Alternative   |

### Real-Time Chat

| Criteria          | Firestore | AWS AppSync/WebSocket |
| ----------------- | --------- | --------------------- |
| Complexity        | Low       | Medium–High           |
| React Integration | Easy      | More setup            |
| Offline Support   | Built-in  | Manual                |

---

## Recommended Architecture

### Async Support Flow

Patient Concern
→ Pub/Sub Topic (patient-concerns)
→ Cloud Function (Coordinator Assignment)
→ Firestore (communication_logs)
→ Notifications Module (SNS/SQS)

### Real-Time Chat

Patient Client
↔ Firestore Chats Collection (onSnapshot)
↔ Coordinator Client

---

## Data Model

### Pub/Sub Message

```json
{
  "patientId": "user_123",
  "concernText": "I cannot find my appointment reference code.",
  "submittedAt": "2026-06-10T14:30:00Z"
}
```

### Communication Log

```json
{
  "patientId": "user_123",
  "coordinatorId": "coord_007",
  "concernText": "...",
  "responseText": null,
  "status": "OPEN",
  "createdAt": "...",
  "assignedAt": "...",
  "respondedAt": null
}
```

### Chat Message

```json
{
  "senderId": "user_123",
  "senderRole": "PATIENT",
  "text": "Hello",
  "sentAt": "2026-06-10T15:00:10Z"
}
```

---

## Reliability and Security

* Pub/Sub provides automatic retries and dead-letter topics.
* Cloud Functions scale automatically.
* Firestore security rules restrict access to the patient and assigned coordinator.
* Communication logs support future analytics such as response times and concern volume.

---

## Final Recommendation

Use:

**GCP Pub/Sub + Cloud Functions + Firestore**

This solution follows the project specification, simplifies real-time chat implementation, provides built-in reliability, and keeps messaging data centralized while integrating with the AWS-based notifications module.
