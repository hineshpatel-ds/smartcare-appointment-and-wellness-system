# Authentication Module Research and Implementation

## Module scope

The authentication module supports guests, registered patients, and wellness coordinators. Guests can browse public services and use the assistant. Registered users complete sequential multi-stage authentication before accessing dashboards and analytics.

## Required authentication stages

SAWS implements three sequential stages:

1. User ID and password.
2. Security question and answer.
3. Healthcare code clue using a Caesar cipher.

## Researched options

Authentication options considered:

- AWS Cognito hosted UI with built-in sign-up and sign-in pages.
- AWS Cognito user pools with custom React screens and backend orchestration.
- Firebase Authentication.
- Fully custom authentication stored only in a database.

The project selected Cognito user pools with custom React screens because it satisfies the AWS identity requirement while preserving the required custom sequential challenge flow.

## Services used

- Amazon Cognito user pool and app client.
- DynamoDB users table for role, security question, normalized security answer, Caesar cipher metadata, and login metadata.
- AWS SNS for registration and sign-in notification events.
- Google Cloud Run backend for orchestration.

## Why Cognito and DynamoDB were chosen

Cognito provides a managed user directory and password authentication flow. This avoids building password identity infrastructure from scratch. DynamoDB stores project-specific authentication metadata that Cognito does not directly model, such as security questions and healthcare code cipher clues.

The backend coordinates both systems:

- Cognito verifies the password stage.
- DynamoDB stores and validates the second and third stages.
- The final response returns a lightweight application token and user role for UI state.

## Current implementation

Endpoints:

- `POST /auth/register`
- `POST /auth/register/confirm`
- `POST /auth/login/start`
- `POST /auth/login/security-question`
- `POST /auth/login/cipher`

Role behavior:

- Patient users can book appointments, view their own history, submit concerns, submit feedback, and view personal analytics.
- Coordinator users can manage services, approve/reject appointments, view support messages, reply to support requests, and monitor analytics.

Security behavior:

- Analytics, appointment history, and message history reject missing login context with `401`.
- Coordinator-only mutations reject non-coordinator context with `403`.
- Registration and login events publish notification messages when SNS is configured.

## References

- Amazon Cognito documentation: https://docs.aws.amazon.com/cognito/
- Amazon Cognito user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html
- Authentication with Cognito user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html
- Amazon DynamoDB developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- AWS SDK for JavaScript: https://docs.aws.amazon.com/sdk-for-javascript/
