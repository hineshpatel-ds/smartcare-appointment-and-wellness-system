# SmartCare Appointment and Wellness System (SAWS)

A comprehensive hybrid AWS/GCP serverless healthcare and wellness application for service discovery, secure authentication, doctor onboarding, appointment booking, support messaging, chatbot assistance, notification workflows, feedback sentiment analysis, analytics, and cross-cloud database mirroring.

Live application: https://saws-ui-5e5rwyweda-uc.a.run.app

## Table of Contents

- [Overview](#overview)
- [Key Benefits](#key-benefits)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Documentation](#documentation)
- [References](#references)

## Overview

SAWS is a full-stack healthcare appointment and wellness platform built for a serverless, multi-cloud architecture. The system provides a public service catalogue for guests, secure multi-stage login for registered users, role-specific dashboards for patients, doctors, and wellness coordinators, and cloud-backed workflows for messaging, notifications, analytics, and mirrored persistence.

The frontend is a React/Vite single-page application deployed on Google Cloud Run. The backend is a Node.js/Express API deployed on Cloud Run that orchestrates AWS Cognito, DynamoDB, SNS, SQS, Google Firestore, Pub/Sub, and Natural Language API integrations.

Current implementation deployment outputs:

- Frontend: `https://saws-ui-5e5rwyweda-uc.a.run.app`
- Backend API: `https://saws-api-5e5rwyweda-uc.a.run.app`

If Cloud Run services are recreated, use Terraform outputs or `gcloud run services describe` to get the latest URLs.

## Key Benefits

- Secure access: Three-stage authentication using password, security question, and Caesar-cipher healthcare code verification.
- Multi-role workflows: Separate guest, patient, doctor, and wellness coordinator experiences.
- Managed cloud services: AWS and GCP services are used for identity, persistence, messaging, notifications, analytics, and deployment.
- Cross-cloud reliability: Operational records are stored in DynamoDB and mirrored into Firestore.
- Healthcare support flow: Patients can book appointments, submit concerns, receive notifications, and provide feedback.
- Analytics visibility: Patients and doctors see scoped activity; coordinators see platform-level operational trends.

## Features

### Authentication and Security

- Patient and doctor self-registration.
- Seeded wellness coordinator account through environment variables.
- AWS Cognito-backed password authentication when Cognito is configured.
- Local fallback authentication for development and demonstrations.
- Security question validation as the second login stage.
- Caesar-cipher healthcare code validation as the final login stage.
- Role-scoped API behavior for protected data and coordinator-only actions.
- Doctor accounts remain inactive until reviewed by a coordinator.

### Guest Experience

- Browse available healthcare and wellness services.
- View specialists, consultation timings, service charges, and package details.
- View public feedback summary and recent service sentiment.
- Use the chatbot for navigation and general service guidance.
- Access public information without logging in.

### Patient Experience

- Register and complete the sequential authentication flow.
- Book only upcoming appointment slots.
- Automatically receive a matching available doctor for the selected service and time.
- View personal appointment history and current appointment status.
- Submit structured support concerns.
- Read coordinator replies to support requests.
- Submit feedback with sentiment analysis.
- View patient-scoped analytics and activity.

### Doctor Experience

- Register as a doctor with license details and selected service specialties.
- Wait for coordinator approval before sign-in is allowed.
- View assigned appointment requests.
- Approve or reject appointment requests.
- Track upcoming and past consultations.
- Manage weekly availability through the dashboard.
- View doctor-scoped analytics for assigned appointments.

### Wellness Coordinator Experience

- Sign in with the same three-stage authentication flow.
- Approve or reject doctor registrations.
- View registered patients and doctors.
- Add or update healthcare and wellness services.
- Review all appointment requests and status changes.
- Approve, reject, or cancel appointment requests.
- Review support concerns and reply asynchronously.
- Monitor platform-level analytics, service popularity, feedback, login events, and doctor approval counts.

### Messaging and Notifications

- Patients and guests can submit support concerns.
- Coordinators can list and reply to support messages.
- Support events can publish through Google Pub/Sub.
- Registration, login, appointment request, and appointment decision emails are sent through Amazon SNS when configured.
- Appointment notification events are published to SNS, delivered to SQS, and processed by Lambda workers.
- SNS email endpoints must confirm the AWS subscription email before they receive delivered notifications.

### Analytics and Feedback

- Feedback submissions include rating, service, comment, and sentiment metadata.
- Google Natural Language API is used when Google runtime credentials are available.
- A heuristic sentiment fallback keeps the application usable locally.
- Patients see their own appointment and feedback activity.
- Doctors see activity for assigned appointments.
- Coordinators see platform-wide counts, login events, trends, service popularity, and feedback records.

### Database Mirroring

- DynamoDB stores primary operational data for users, services, appointments, feedback, messages, and login statistics.
- Firestore receives mirrored users, services, appointments, feedback, and support messages.
- Mirrored records include `_source` markers to avoid write loops.
- Firestore-to-DynamoDB mirror helpers are included for cross-cloud recovery and reporting scenarios.

## Technology Stack

### Frontend

- Framework: React 19 with Vite
- Routing: React Router
- HTTP client: Axios
- Icons: Lucide React
- Linting: Oxlint
- Deployment: Google Cloud Run container

### Backend

- Runtime: Node.js
- Framework: Express 5
- AWS SDK: Cognito, DynamoDB, SNS, SQS
- Google SDKs: Firestore, Pub/Sub, Natural Language API
- Local development fallback: Persistent JSON-backed in-memory maps
- Deployment: Google Cloud Run container

### Cloud and Infrastructure

- Authentication: Amazon Cognito
- Primary database: Amazon DynamoDB
- Mirrored database: Google Firestore
- Support messaging: Google Pub/Sub
- Notifications: Amazon SNS and Amazon SQS
- Serverless workers: AWS Lambda
- Hosting: Google Cloud Run
- Infrastructure as Code: Terraform with AWS and Google providers
- Containerization: Docker

## Project Structure

```text
saws-main/
|-- backend/                         # Express API, Lambda handlers, shared service logic
|   |-- analytics/                    # Feedback and analytics aggregation
|   |-- appointment-lambdas/          # Services and appointment workflows
|   |-- auth-lambdas/                 # Registration, login, doctor approval, user listing
|   |-- chatbot-functions/            # Chatbot endpoint/function handlers
|   |-- database-mirroring/           # DynamoDB <-> Firestore mirror functions
|   |-- lib/                          # Store, utility, and persistent map helpers
|   |-- messaging-functions/          # Support message workflows
|   |-- notifications-lambdas/        # SNS/SQS email and reminder handlers
|   |-- test/                         # Backend smoke and module tests
|   |-- server.js                     # Main Express API
|   |-- service.js                    # Service composition exports
|   |-- smoke-test.js                 # Backend test runner
|   `-- Dockerfile                    # Backend container image
|
|-- frontend/                         # React/Vite frontend application
|   |-- public/                       # Runtime env and static assets
|   |-- src/
|   |   |-- api/                      # API client
|   |   |-- components/               # Shared UI components
|   |   |-- context/                  # Authentication context
|   |   `-- modules/                  # Landing, auth, dashboards, analytics
|   |-- test/                         # Frontend UI and API-client tests
|   |-- vite.config.js
|   `-- Dockerfile                    # Frontend container image
|
|-- terraform/                        # Infrastructure as Code
|   |-- analytics/                    # Backend Cloud Run and analytics env
|   |-- appointment/                  # Appointment tables/functions
|   |-- auth/                         # Cognito and auth DynamoDB resources
|   |-- chatbot/                      # Chatbot cloud resources
|   |-- frontend/                     # Frontend Cloud Run service
|   |-- messaging/                    # Pub/Sub, Firestore, support messaging resources
|   |-- notifications/                # SNS, SQS, notification Lambda resources
|   |-- main.tf                       # Root Terraform module composition
|   |-- providers.tf
|   `-- variables.tf
|
|-- docs/
|   |-- api/                          # API contract and OpenAPI documentation
|   |-- architecture/                 # Architecture diagrams
|   `-- research/                     # Module research and service selection writeups
|
|-- deploy-all.ps1                    # Windows deployment helper
|-- deploy-all.sh                     # Bash deployment helper
`-- README.md
```

## Quick Start

### Prerequisites

Backend and frontend:

- Node.js 18+
- npm 9+

Cloud deployment:

- Docker
- Terraform
- Google Cloud project with Cloud Run, Firestore, Pub/Sub, and Natural Language API access
- AWS account or lab environment with Cognito, DynamoDB, SNS, SQS, and Lambda access
- AWS credentials and Google credentials configured locally or through CI/CD

### Clone and Install

```bash
git clone <repository-url>
cd saws-main
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### Backend Setup

Run the backend locally:

```bash
cd backend
npm start
```

Default backend URL:

```text
http://localhost:8080
```

For local-only development without waiting on unavailable cloud resources, set:

```bash
FORCE_LOCAL_STORE=true
```

Useful backend environment variables:

```text
PORT
PROJECT_NAME
AWS_REGION
USERS_TABLE
APPOINTMENTS_TABLE
FEEDBACK_TABLE
MESSAGES_TABLE
SERVICES_TABLE
LOGIN_STATS_TABLE
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
SNS_TOPIC_ARN
SQS_QUEUE_URL
PUBSUB_TOPIC
ENABLE_DB_MIRRORING
GOOGLE_APPLICATION_CREDENTIALS
COORDINATOR_USER_ID
COORDINATOR_EMAIL
COORDINATOR_PASSWORD
COORDINATOR_SECURITY_QUESTION
COORDINATOR_SECURITY_ANSWER
COORDINATOR_HEALTHCARE_CODE
```

### Frontend Setup

Run the frontend locally:

```bash
cd frontend
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

Configure the API base URL through `frontend/public/env.js` or Vite environment settings so the frontend points to either the local backend or the deployed backend.

## API Documentation

### Base URLs

Development:

```text
http://localhost:8080
```

Deployed implementation:

```text
https://saws-api-5e5rwyweda-uc.a.run.app
```

### Key Endpoints

Authentication:

- `POST /auth/register` - Register a patient or doctor.
- `POST /auth/register/confirm` - Confirm Cognito registration code when required.
- `POST /auth/login/start` - Start password authentication.
- `POST /auth/login/security-question` - Validate the security question answer.
- `POST /auth/login/cipher` - Validate the Caesar-cipher healthcare code.

Services and doctors:

- `GET /services` - List public healthcare and wellness services.
- `POST /services` - Add or update a service as a coordinator.
- `PUT /services/{serviceId}` - Update a specific service as a coordinator.
- `GET /doctors` - List active approved doctors.
- `GET /doctors/pending` - List doctors waiting for coordinator approval.
- `PATCH /doctors/{doctorId}/approval` - Approve or reject a doctor registration.
- `PUT /doctors/{doctorId}/schedule` - Update doctor weekly availability.
- `GET /users?targetRole={patient|doctor}` - Coordinator list of registered users by role.

Appointments:

- `POST /appointments` - Book a future appointment.
- `GET /appointments?userId={id}&role={role}` - List role-scoped appointments.
- `PATCH /appointments/{appointmentId}` - Confirm, reject, or cancel an appointment.

Messaging:

- `POST /messages/support` - Submit a support concern.
- `GET /messages?userId={id}&role={role}` - List role-scoped support messages.
- `POST /messages/{messageId}/reply` - Add a coordinator reply.

Chatbot, feedback, and analytics:

- `POST /chatbot` - Ask the virtual assistant.
- `POST /feedback` - Submit service feedback with sentiment analysis.
- `GET /feedback/summary` - View public aggregate feedback summary.
- `POST /analyze` - Analyze text sentiment.
- `GET /analytics/summary?userId={id}&role={role}` - View role-scoped analytics.

Complete API documentation:

- `docs/api/api.md`
- `docs/api/api-contract.md`
- `docs/api/swagger.yaml`

## Development

### Backend Development

```bash
cd backend
npm install
npm start
```

Run backend validation:

```bash
node --check server.js
node --check service.js
npm test
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Run frontend validation:

```bash
npm run lint
npm run build
```

### Local API Wiring

The frontend API client reads runtime configuration from `frontend/public/env.js`. Point it to:

- `http://localhost:8080` for local backend development.
- The deployed Cloud Run API URL for cloud testing.

## Deployment

### Terraform Deployment

Terraform modules are composed from `terraform/main.tf`.

Typical deployment flow:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Required or commonly used Terraform variables:

- `gcp_project_id`
- `gcp_region`
- `aws_region`
- `aws_access_key_id`
- `aws_secret_access_key`
- `aws_session_token` when using temporary AWS lab credentials
- `lambda_role_arn`
- `frontend_image`
- `backend_image`
- `coordinator_user_id`
- `coordinator_email`
- `coordinator_password`
- `coordinator_security_question`
- `coordinator_security_answer`
- `coordinator_healthcare_code`

Do not commit real cloud credentials. Use environment variables, CI/CD variables, or local `.tfvars` files excluded from Git.

### Docker Image Deployment

Build and push the frontend image:

```bash
cd frontend
docker build -t gcr.io/<project-id>/saws-frontend:latest .
docker push gcr.io/<project-id>/saws-frontend:latest
```

Build and push the backend image:

```bash
cd backend
docker build -t gcr.io/<project-id>/saws-analytics:latest .
docker push gcr.io/<project-id>/saws-analytics:latest
```

Helper scripts are included:

- `deploy-all.ps1` for PowerShell.
- `deploy-all.sh` for Bash.

Review project IDs and credentials in those scripts before running them in a different environment.

## Testing

### Backend Testing

```bash
cd backend
npm test
```

Additional syntax checks:

```bash
node --check server.js
node --check service.js
```

Backend tests cover:

- Authentication and multi-stage login behavior.
- Appointment booking and status updates.
- Messaging and support replies.
- Notifications and queue processing.
- Feedback analytics and sentiment fallback.
- Database mirroring helpers.
- Chatbot behavior.

### Frontend Testing

```bash
cd frontend
npm run lint
npm run build
```

Frontend test files cover:

- API client behavior.
- Authentication UI behavior.
- Appointment UI behavior.
- Analytics and chatbot UI behavior.
- Route guards.

## Documentation

### API and Contract Documentation

- `docs/api/api.md`
- `docs/api/api-contract.md`
- `docs/api/swagger.yaml`

### Research Documentation

- `docs/research/architecture.md`
- `docs/research/authentication.md`
- `docs/research/frontend-backend-deployment.md`
- `docs/research/messaging.md`
- `docs/research/notifications.md`
- `docs/research/chatbot.md`
- `docs/research/analytics.md`

### Architecture Diagrams

- `docs/architecture/Architecture.png`
- `docs/architecture/MultiCloud_AWS_GCP.png`
- `docs/architecture/Data_Flow_Diagram.png`
- `docs/architecture/Database_Mirroring.png`

## References

- Google Cloud Run: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Amazon Cognito: https://docs.aws.amazon.com/cognito/
- Amazon DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- Google Cloud Pub/Sub: https://cloud.google.com/pubsub/docs
- Firestore: https://cloud.google.com/products/firestore
- Amazon SNS: https://docs.aws.amazon.com/sns/
- Amazon SQS: https://docs.aws.amazon.com/sqs/
- Google Natural Language API: https://docs.cloud.google.com/natural-language/docs/basics
- Terraform AWS provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
