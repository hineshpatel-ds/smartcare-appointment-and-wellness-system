# Frontend, Backend, and Deployment Research and Implementation

## Module scope

This file covers the implemented React frontend, Node.js backend, container packaging, Cloud Run deployment, and Terraform provisioning strategy.

## Researched frontend options

Frontend options considered:

- React with Vite.
- Next.js.
- Static HTML with minimal JavaScript.

React with Vite was selected because it gives a fast single-page application development flow, works well with Cloud Run container deployment, and supports a role-aware healthcare dashboard without the extra routing/server-rendering complexity of Next.js.

## Researched backend options

Backend options considered:

- Express on Cloud Run.
- API Gateway plus Lambda per endpoint.
- Cloud Functions per endpoint.

Express on Cloud Run was selected because the project needs one cohesive API that coordinates AWS and GCP services. A single backend keeps authorization, mirroring, and error handling centralized.

## Services and tools used

- React, Vite, and lucide-react for frontend UI.
- Node.js and Express for API orchestration.
- Dockerfiles for frontend and backend containers.
- Google Cloud Run for deployed frontend and backend services.
- Terraform modules for AWS and GCP infrastructure.
- GitLab CI configuration for install/build/deploy workflow support.

## Why Cloud Run was chosen

Cloud Run provides a managed HTTPS endpoint for containers and supports source-based deployment as well as container image deployment. It is a good fit for both the frontend container and API container because both are stateless HTTP services.

Cloud Run also reduces operational work: no VM patching, no cluster management, and automatic scaling for demo and course workloads.

## Current implementation

Frontend:

- `frontend/src/App.jsx` implements guest, patient, and coordinator workflows.
- Guests can view services, pricing, timings, and chatbot assistance.
- Patients can register, complete three-stage login, book future appointments, view history, send concerns, submit feedback, and view personal analytics.
- Coordinators can manage services, review appointment requests, approve/reject appointments, view messages, and monitor platform analytics.

Backend:

- `backend/server.js` defines the REST API routes.
- `backend/service.js` implements Cognito, DynamoDB, Firestore mirroring, Pub/Sub, SNS/SQS, sentiment analysis, chatbot logic, and role enforcement.
- API-level protections reject unauthenticated analytics/history access and coordinator-only mutations.

Deployment:

- `terraform/main.tf` composes the domain modules.
- `terraform/frontend` provisions the frontend Cloud Run service.
- `terraform/analytics` provisions the backend Cloud Run service.
- Other Terraform modules provision authentication, appointments, messaging, notifications, chatbot, and supporting data stores.

## Runtime URLs

The latest deployed services from implementation work were:

- Frontend: `https://saws-ui-474600405419.us-central1.run.app`
- API: `https://saws-api-474600405419.us-central1.run.app`

These URLs can change if services are recreated, so prefer Terraform outputs or `gcloud run services describe` when validating a new deployment.

## References

- React documentation: https://react.dev/
- Vite documentation: https://vite.dev/
- Express documentation: https://expressjs.com/
- Google Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Managing Cloud Run services: https://docs.cloud.google.com/run/docs/managing/services
- Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Terraform AWS provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
