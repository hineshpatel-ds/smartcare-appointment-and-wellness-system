# SAWS Chatbot Module – Sprint 1 Full Planning Document

## 1. Module Overview

The Virtual Assistant module is one of the core features of the SmartCare Appointment and Wellness System (SAWS). The chatbot's purpose is to provide support and navigation for different user types (e.g., Guests, Registered Patients, and Wellness Coordinators) while improving accessibility and reducing the need for manual assistance in common tasks.

For this module, we have chosen to use AWS Lex, AWS Lambda, and Amazon DynamoDB as the underlying architecture [1]–[3].

---

## 2. Problem Statement

The SAWS platform includes multiple user roles, healthcare and wellness services, appointment management functions, and support workflows. Without a support layer, users may struggle to locate services and features, retrieve appointment details, or submit concerns efficiently.

A chatbot module helps address these challenges by providing a user-friendly interface for:

- Navigation assistance
- Appointment support
- Service inquiries
- Concern submissions
- Frequently Asked Questions (FAQs)

This creates a more intuitive and confusion-free user experience.

---

## 3. Objectives

The primary objective of the chatbot module is to provide an accessible virtual assistant for the SAWS platform that supports user interaction and basic service retrieval.

For the scope of this project, the chatbot is expected to:

- Assist users with application navigation.
- Support appointment lookup using appointment reference codes.
- Provide wellness package inquiry support.
- Accept patient concerns and forward them to wellness coordinators.
- Answer Frequently Asked Questions (FAQs).

---

## 4. Intended Users

### Guests

Guests can use the chatbot for:

- Navigation assistance
- Service information
- General wellness package exploration

Guest functionality is limited compared to registered users.

### Registered Patients

Registered Patients can:

- Navigate the system
- Retrieve appointments using reference codes
- View appointment details
- Submit concerns and support requests for follow-up

### Wellness Coordinators

Wellness Coordinators are primarily responsible for administrative support and can:

- Retrieve appointment details for registered patients

---

## 5. Selected Services with justification

The proposed service stack for this chatbot module is AWS Lex V2 + AWS Lambda + DynamoDB. The reason why this stack is chosen over GCP is that it’s consistent which reduces unnecessary complexity during later implementation planning. Additionally, it’s also within the AWS Ecosystem and it has the natural integration with AWS Lambda fulfilment and supports slot-based conversation flows for collecting user input such as appointment reference codes [1]. Lambda can then perform backend processing and query DynamoDB based on the values collected by Lex V2, which suits the chatbot’s appointment lookup and FAQ use cases [2], [3].

---

## 6. Preliminary architecture design

The following high-level architecture is proposed for the chatbot module and gives the overall interaction and flow when the user interacts with the system:

**User → React Frontend → AWS Lex V2 → AWS Lambda → DynamoDB → Respond to User**

### Component Roles

**React Frontend:** provides the chat interface inside the SAWS Web App.
**AWS Lex V2:** Identifies the user’s intent and gathers any missing slot values required to fulfil the request. E.g. reference code [1].
**AWS Lambda:** It acts like the fulfilment layer that processes the request and interact with storage [2].
**DynamoDB:** Stores data needed for chatbot responses such as appointment information [3].

---

## 7. Initial API and technology research

Initial research for the chatbot module focused on how AWS Lex V2 structures conversations through intents, slots, and slot types [1]. The bot first identifies the users intent, then requests any missing information needed to complete that intent, such as an appointment reference code for appointment lookup.

For the planning purpose phase, the following chatbot intent areas are proposed:

- NavigationAssistIntent
- AppointmentLookupIntent
- WellnessPackageInquiryIntent
- SubmitConcernIntent
- FAQIntent

The following example slot ideas were also identified during research:

- ReferenceCode for appointment lookup
- FeatureName for navigation-related questions
- PackageName for wellness package inquiries

---

## 8. References reviewed during research

[1] Amazon Web Services, "What is Amazon Lex V2?," Amazon Lex Developer Guide. [Online]. Available: https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html. [Accessed: 11-Jun-2026].

[2] Amazon Web Services, "What is AWS Lambda?," AWS Lambda Developer Guide. [Online]. Available: https://docs.aws.amazon.com/lambda/latest/dg/welcome.html. [Accessed: 11-Jun-2026].

[3] Amazon Web Services, "What is Amazon DynamoDB?," Amazon DynamoDB Developer Guide. [Online]. Available: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html. [Accessed: 11-Jun-2026].
