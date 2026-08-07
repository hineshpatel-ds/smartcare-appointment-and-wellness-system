# SmartCare Appointment and Wellness System (SAWS)

Live link: https://saws-ui-lfp7yothla-uc.a.run.app/ 

SAWS is a hybrid AWS/GCP serverless healthcare and wellness platform. It supports guest service discovery, secure patient/coordinator login, appointment booking, support messaging, chatbot assistance, notifications, feedback sentiment analysis, analytics, and cross-cloud database mirroring.

## Live deployment

Latest deployed Cloud Run services from the implementation:

- Frontend: `https://saws-ui-474600405419.us-central1.run.app`
- Backend API: `https://saws-api-474600405419.us-central1.run.app`

If Cloud Run services are recreated, use Terraform outputs or `gcloud run services describe` to get the latest URLs.

## User types

### Guests

- View available healthcare and wellness services.
- Review doctors/specialists, consultation timings, service charges, and wellness packages.
- Use the virtual assistant for navigation and service/package guidance.
- View public service information without logging in.

### Registered Patients

- Complete sequential multi-stage authentication:
  1. User ID and password.
  2. Security question and answer.
  3. Healthcare code clue using Caesar cipher.
- Book only upcoming appointments.
- View personal appointment history and appointment status.
- Submit support concerns.
- Use the chatbot for navigation, appointment lookup, and support requests.
- Submit structured feedback with sentiment analysis.
- View only their own analytics and activity.

### Wellness Coordinators

- Complete the same sequential authentication flow.
- Add or update healthcare and wellness services.
- Manage doctors/specialists schedules through service availability data.
- Approve or reject appointment requests.
- Manage service pricing and package information.
- Review support concerns and communicate asynchronously with patients.
- Monitor platform-level analytics and engagement.

## Implemented cloud services

| Area | Services |
|---|---|
| Frontend | React + Vite on Google Cloud Run |
| Backend/API | Node.js + Express on Google Cloud Run |
| Authentication | AWS Cognito, DynamoDB, backend auth orchestration |
| Database | DynamoDB primary operational tables, Firestore mirrored collections |
| Chatbot | React chatbot widget, Cloud Run chatbot endpoint, Dialogflow-ready fulfillment design |
| Messaging | Google Pub/Sub, DynamoDB support messages, Firestore mirror |
| Notifications | AWS SNS, AWS SQS, Lambda processors |
| Analytics | Cloud Run API aggregation, Google Natural Language API, Looker Studio-ready mirrored data |
| Infrastructure | Terraform AWS and Google providers |

## Project structure

```text
frontend/                  React/Vite frontend application
backend/                   Express API, Lambda handlers, mirroring functions
terraform/                 Infrastructure as Code
  auth/                    Cognito and authentication DynamoDB resources
  frontend/                Frontend Cloud Run service
  messaging/               Pub/Sub, Firestore, messaging resources
  notifications/           SNS, SQS, notification Lambda resources
  chatbot/                 Chatbot cloud resources
  appointment/             Appointment tables/functions
  analytics/               Backend Cloud Run service and analytics env

docs/
  api/                     API contract and OpenAPI documentation
  research/                Module research and service selection writeups
  architecture/            Mermaid source files for architecture diagrams
```

## API overview

The backend API includes:

- `GET /health`
- `GET /services`
- `POST /auth/register`
- `POST /auth/register/confirm`
- `POST /auth/login/start`
- `POST /auth/login/security-question`
- `POST /auth/login/cipher`
- `POST /appointments`
- `GET /appointments?userId={id}&role={role}`
- `PATCH /appointments/{appointmentId}`
- `POST /messages/support`
- `GET /messages?userId={id}&role={role}`
- `POST /messages/{messageId}/reply`
- `POST /chatbot`
- `POST /feedback`
- `POST /analyze`
- `GET /analytics/summary?userId={id}&role={role}`

See `docs/api/api.md`, `docs/api/api-contract.md`, and `docs/api/swagger.yaml` for details.

## Security and authorization behavior

- Guest users can access public service information and chatbot assistance.
- Analytics, appointment history, and message history require login context.
- Patients receive patient-scoped data only.
- Coordinator-only mutations return `403` unless the request includes coordinator context.
- Past appointment booking is rejected by both frontend validation and backend validation.
- Cloud provider/API implementation details are not shown in the UI.

## Database mirroring

SAWS mirrors records between DynamoDB and Firestore to demonstrate cross-cloud availability and reliability:

- Backend writes operational records to DynamoDB.
- Backend mirrors users, appointments, services, feedback, and support messages to Firestore.
- Mirroring functions include `_source` markers to avoid write loops.
- Firestore provides a Google-native mirrored copy for future reporting and recovery scenarios.

## Local development

### Backend

```bash
cd backend
npm install
npm start
```

Default backend URL:

```text
http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

For local API wiring, configure `frontend/public/env.js` or Vite environment settings so the frontend points to the local or deployed backend.

## Validation commands

```bash
cd backend
node --check server.js
node --check service.js
npm test
```

```bash
cd frontend
npm run lint
npm run build
```

## Terraform deployment

Terraform modules are composed from `terraform/main.tf`.

Typical flow:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Required variables include:

- `gcp_project_id`
- `gcp_region`
- `aws_region`
- `aws_access_key_id`
- `aws_secret_access_key`
- `aws_session_token` when using temporary AWS lab credentials
- `frontend_image` and `backend_image` if using prebuilt container images

Do not commit real cloud credentials. Use environment variables, CI/CD variables, or local `.tfvars` files excluded from Git.

## Documentation index

API docs:

- `docs/api/api.md`
- `docs/api/api-contract.md`
- `docs/api/swagger.yaml`

Research docs:

- `docs/research/analytics.md`
- `docs/research/architecture.md`
- `docs/research/authentication.md`
- `docs/research/chatbot.md`
- `docs/research/messaging.md`
- `docs/research/notifications.md`
- `docs/research/frontend-backend-deployment.md`

Architecture Mermaid sources:

- `docs/architecture/final-full-architecture.mmd`
- `docs/architecture/full-data-flow-diagram.mmd`
- `docs/architecture/hybrid-aws-gcp-architecture.mmd`
- `docs/architecture/database-mirroring-flow.mmd`

Paste the Mermaid code into https://mermaid.live or Mermaid-compatible Markdown tooling to export PNG/SVG diagrams.

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
