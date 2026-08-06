# Chatbot Module Research and Implementation

## Module scope

The chatbot assists guests, patients, and coordinators with navigation, service/package pricing, appointment lookup, and support concern submission.

## Researched options

Chatbot options considered:

- Google Dialogflow ES for intent-based FAQ and simple appointment-support flows.
- Google Dialogflow CX for more advanced multi-turn conversation design.
- AWS Lex for AWS-native conversational flows.
- Lightweight backend chatbot logic for deterministic project workflows.

The final implementation keeps chatbot behavior in the Express backend while documenting Dialogflow as the target managed NLU service. This kept the application fully working in Cloud Run while preserving a clean integration point for Dialogflow fulfillment.

## Services used

- React chatbot widget in the frontend.
- Cloud Run backend endpoint `POST /chatbot`.
- Pub/Sub support concern publishing when a concern is submitted.
- DynamoDB and Firestore access for appointment lookup and mirrored support messages.
- Dialogflow is the intended managed NLU integration for future intent routing.

## Why this design was chosen

Dialogflow is well suited to a healthcare navigation assistant because it can map natural language utterances to structured intents. However, for a sprint-complete project, deterministic backend logic gives reliable demos for the required flows without requiring exported agent configuration to be synchronized with deployment.

The backend approach also keeps appointment lookup and support concern creation behind the same API authorization and data access layer used by the rest of the system.

## Current implementation

The `POST /chatbot` endpoint supports:

- Appointment lookup when the user provides an appointment reference code.
- Service and wellness package pricing responses.
- Support concern submission through the same support-message flow.
- Navigation guidance for Services, Dashboard, Messages, and Analytics.

Guest usage is allowed for general navigation and support. Logged-in users pass `userId` with chatbot requests so submitted concerns can be tied to their account.

## Future Dialogflow integration

Dialogflow can be added by mapping intents to backend fulfillment:

- `AppointmentLookupIntent` calls appointment lookup.
- `ServicePricingIntent` calls service listing.
- `SubmitConcernIntent` calls support concern submission.
- `NavigationIntent` returns UI guidance.

## References

- Dialogflow CX documentation: https://docs.cloud.google.com/dialogflow/docs
- Dialogflow ES intent responses: https://cloud.google.com/dialogflow/es/docs/intents-responses
- Google Cloud Pub/Sub documentation: https://cloud.google.com/pubsub/docs
- Firestore documentation: https://cloud.google.com/products/firestore
- Google Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
