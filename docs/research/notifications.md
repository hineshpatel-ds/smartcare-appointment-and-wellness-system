# Notifications Module Research and Implementation

## Module scope

The notifications module sends registration, sign-in, appointment request, and appointment status notification events. It supports the project requirement that registered patients and coordinators receive notifications for important account and appointment actions.

## Researched options

Notification options considered:

- Amazon SNS for publish/subscribe notification events.
- Amazon SQS for decoupling notification processing.
- Google Pub/Sub for all event messaging.
- Direct synchronous notification calls from the API.

The final design uses SNS and SQS because the requirement specifically names AWS notification services and because SNS/SQS are a common pairing for fan-out and queued processing.

## Services used

- Amazon SNS topic for notification publishing.
- Amazon SQS queue for appointment notification events.
- AWS Lambda handler in `backend/notifications-lambdas/process-sqs.js` for queued notification processing.
- Cloud Run backend publishes registration and login notifications to recipient-specific SNS email topics. Appointment events are published to the shared SNS topic, delivered to SQS, and processed by Lambda.

## Why SNS and SQS were chosen

SNS is appropriate for event-style notifications because one publisher can send to multiple subscribers. SQS is appropriate for appointment notifications because it buffers work and decouples appointment booking from downstream delivery.

This combination improves reliability: the appointment booking request does not need to wait for every notification action to finish, and the queue can retry processing independently.

## Current implementation

Notification events:

- `REGISTRATION_SUCCESS`
- `LOGIN_SUCCESS`
- `APPOINTMENT_REQUEST`
- `APPOINTMENT_CONFIRMED`
- `APPOINTMENT_REJECTED`
- `APPOINTMENT_CANCELLED`

Backend behavior:

- `registerUser` publishes registration email notifications through SNS.
- `verifyCipher` publishes successful sign-in email notifications through SNS after all authentication stages pass.
- `bookAppointment` publishes appointment request events to SNS, which fans out to SQS.
- `updateAppointment` publishes status-change events to SNS, which fans out to SQS.

## References

- Amazon SNS documentation: https://docs.aws.amazon.com/sns/
- Amazon SQS documentation: https://docs.aws.amazon.com/sqs/
- Amazon SQS developer overview: https://aws.amazon.com/documentation-overview/sqs/
- AWS Lambda documentation: https://docs.aws.amazon.com/lambda/
- Terraform AWS provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
