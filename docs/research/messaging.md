# Messaging Module Research and Implementation

## Module scope

The messaging module handles asynchronous support concerns and patient/coordinator communication. Patients can submit concerns, coordinators can review and reply, and chatbot support requests reuse the same message path.

## Researched options

Messaging options considered:

- Google Cloud Pub/Sub for event distribution.
- Firestore-only message collections with real-time listeners.
- AWS SQS queues for decoupled support processing.
- Direct synchronous writes through the backend only.

SAWS uses Pub/Sub for support concern events and DynamoDB/Firestore for durable message records. This keeps the support workflow event-driven while still giving the frontend a stable API for listing messages.

## Services used

- Google Pub/Sub topic for support concern publishing.
- DynamoDB support messages table for operational storage.
- Firestore mirrored `support-messages` collection.
- Cloud Function style handler in `backend/messaging-functions/index.js`.
- Cloud Run backend endpoints for support submission, listing, and replies.

## Why Pub/Sub and Firestore were chosen

Pub/Sub is designed for asynchronous communication between services and supports decoupling the request path from downstream handling. Firestore is a good secondary store for document-shaped support messages and future real-time UI updates.

DynamoDB remains the primary operational table for the backend because the rest of the AWS-side modules use it consistently. Mirroring support messages into Firestore demonstrates the requested cross-cloud database reliability pattern.

## Current implementation

Endpoints:

- `POST /messages/support` creates a support concern.
- `GET /messages?userId={id}&role={role}` lists scoped messages.
- `POST /messages/{messageId}/reply` adds a coordinator reply.

Authorization behavior:

- Missing login context for listing returns `401`.
- Patients see their own messages and guest messages.
- Coordinators see all messages.
- Replies require coordinator context.

## Data flow

1. User submits a concern from the dashboard or chatbot.
2. Backend publishes the concern to Pub/Sub when GCP runtime credentials are available.
3. Backend writes the durable support message to DynamoDB.
4. Backend mirrors the message to Firestore.
5. Coordinator lists messages and replies through the API.

## References

- Google Cloud Pub/Sub documentation: https://cloud.google.com/pubsub/docs
- Firestore documentation: https://cloud.google.com/products/firestore
- Amazon DynamoDB developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- Google Cloud Functions documentation: https://cloud.google.com/functions/docs
- Google Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
