# Architecture Research and Implementation

## Architecture goal

SAWS is implemented as a hybrid serverless healthcare and wellness platform. The architecture separates user experience, API orchestration, identity, persistence, asynchronous messaging, notifications, chatbot assistance, and analytics while keeping the implementation small enough for a course project demonstration.

## Researched options

Three architecture styles were considered:

- Single-cloud AWS serverless architecture using Cognito, Lambda, API Gateway, DynamoDB, SNS, and SQS.
- Single-cloud GCP serverless architecture using Cloud Run, Firestore, Pub/Sub, Dialogflow, and Natural Language API.
- Hybrid AWS/GCP architecture using the strongest managed service fit from each cloud.

The hybrid architecture was selected because the project requirement explicitly includes both AWS and GCP services and because it demonstrates cross-cloud integration, database mirroring, and resilience patterns.

## Implemented architecture

Frontend:

- React and Vite single-page application.
- Containerized and deployed on Google Cloud Run.
- Runtime `API_BASE_URL` is injected through `public/env.js`.

Backend:

- Node.js and Express API.
- Deployed on Google Cloud Run.
- Handles authentication orchestration, appointment booking, support messaging, chatbot replies, feedback, analytics, and database mirroring.

AWS services:

- Cognito user pool and app client for password-based identity.
- DynamoDB tables for users, appointments, feedback, services, support messages, and login statistics.
- Lambda functions for module-specific backend hooks.
- SNS for registration, login, and appointment notification publishing.
- SQS for appointment notification queueing.

GCP services:

- Cloud Run for frontend and API services.
- Firestore for mirrored operational records.
- Pub/Sub for support concern events.
- Dialogflow is the researched chatbot target; the deployed API currently provides chatbot behavior directly and can be connected to Dialogflow fulfillment.
- Natural Language API for feedback sentiment.

Infrastructure:

- Terraform modules are organized by domain: `auth`, `frontend`, `messaging`, `notifications`, `chatbot`, `appointment`, and `analytics`.

## Why this architecture was chosen

The final design keeps modules cohesive:

- Authentication stays with Cognito and DynamoDB user records.
- Appointment and service workflows stay in the API and DynamoDB, with Firestore mirroring.
- Messaging uses Pub/Sub for GCP-native asynchronous support concern distribution.
- Notifications use SNS and SQS because they map cleanly to publish/queue notification flows.
- Analytics is centralized in the backend so role filtering happens before data is returned.

It is also less coupled than a fully direct frontend-to-cloud design. The frontend only talks to one backend API, while the backend owns cloud provider integrations and data consistency.

## Database mirroring design

The backend writes primary operational data to DynamoDB and mirrors records to Firestore with a `_source` marker. Supporting functions also allow Firestore events to mirror back into DynamoDB while avoiding mirror loops. This improves availability for read/reporting scenarios and demonstrates cross-cloud data redundancy.

## References

- Google Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Amazon Cognito user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html
- Amazon DynamoDB developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- Firestore documentation: https://cloud.google.com/products/firestore
- Terraform AWS provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
