# SmartCare Appointment and Wellness System (SAWS)

Live link: https://saws-ui-lfp7yothla-uc.a.run.app/ 

## Analytics & AI Module (Sprint 2)

Coordinator dashboard, feedback form, and sentiment analysis. Backend is a
mock API with sample data and a Comprehend-shaped sentiment stub
(`backend/services/sentiment.js`) that can be swapped for the real AWS
Comprehend SDK call later.

## Chatbot Module (Sprint 2)

AWS Lex virtual assistant integrated via Express backend. Handles appointment
lookups, concern submission, and FAQ intents.

### Chatbot Intents
- `SubmitConcernIntent` — concern submission flow
- `FAQIntent` — booking/cancellation help
- `AppointmentLookupIntent` — lookup by reference code

### Architecture Flow
1. User sends a message through the chatbot interface.
2. AWS Lex identifies the matching intent.
3. Lex invokes AWS Lambda for fulfillment.
4. Lambda reads from / writes to DynamoDB.
5. Lex sends the final response back to the user.

## Running locally

```bash
# terminal 1 — unified backend (analytics + chatbot)
cd backend && npm install && npm start   # http://localhost:4000

# terminal 2 — frontend
cd frontend && npm install && npm run dev  # http://localhost:5173
```



## Current Working Features
The following chatbot functions are currently working in the Sprint 2 prototype:
- Navigation support for appointment-related guidance.
- Appointment lookup using an appointment reference code.
- Concern submission flow that prompts the user and confirms submission.
- Basic FAQ support for registration and platform help.

## Chatbot Intents
Current intents implemented in the bot:
- `SubmitConcernIntent`
- `FAQIntent`
- `AppointmentLookupIntent`

Planned / future intents:
- `NavigationIntent`
- `WellnessPackageInquiryIntent`.

## Intent Details
### SubmitConcernIntent
Sample utterances currently used:
- `I want to submit a concern`
- `I have a complaint`
- `I need support`
- `I want to report an issue`

This intent maps directly to the requirements for the project that the chatbot should accept patient concerns or support requests and forward them through the system. 

### FAQIntent

Sample utterances currently used:
- `How do I {faqTopic}` ---> eg. `How do I cancel`, `How do I book`
- `Help me with {faqTopic}`
- `I need help with {faqTopic}`
- `How do I book an appointment`
- `How do I cancel an appointment`

This intent supports the required FAQ function of the virtual assistant. 

## Slot Type
### faqTopicType
Custom slot values currently used (faqTopic):
- `booking`
- `book`
- `book appointment`
- `make appointment`
- `cancel`
- `canceling`
- `cancel appointment`

### AppointmentLookupIntent
These values support FAQ utterances related to booking and cancellation help, which are part of the user support expectations described in the project document.

## Architecture Flow
1. A user sends a message through the Lex console or chatbot interface.
2. AWS Lex identifies the matching intent.
3. Lex collects slot values when needed.
4. Lex invokes AWS Lambda for fulfillment.
5. Lambda processes the request and reads from or writes to DynamoDB where applicable.
6. Lambda returns the response to Lex.
7. Lex sends the final chatbot response back to the user.

## Sample Working Tests
These are the tests that currently work and can be demonstrated now:

| Intent | Input | Expected Result |
|--------|-------|----------------|
| SubmitConcernIntent | `I want to submit a concern` | Prompts the user for concern details and confirms submission. |
| SubmitConcernIntent | `I have a complaint` | Routes the user into the concern submission flow. |
| SubmitConcernIntent | `I need support` | Routes the user into the concern or support flow. |
| SubmitConcernIntent | `I want to report an issue` | Prompts the user to submit issue details. |
| FAQIntent | `How do I book an appointment` | Returns booking help information. |
| FAQIntent | `How do I cancel an appointment` | Returns cancellation help information. |
| AppointmentLookupIntent | `Check appointment with code APT1001` | Returns appointment details for the provided appointment reference code. |


## Suggested Extra Tests
The project also expects broader chatbot testing, Lambda event testing, and documentation evidence. Good next tests to add are:
- `Help me with booking`
- `I need help with cancel appointment`
- `Show appointment details for APT1002`
- `Check appointment with code APT4040`
- `What wellness packages are available`. (Future)

## Current Status
Implemented now:
- Lex bot setup.
- Working intents for concern submission, FAQ, and appointment lookup.
- Lambda fulfillment for the currently working chatbot flows.
- Initial chatbot testing using sample utterances.

`.env file`
PORT=5000
AWS_REGION=us-east-1
LEX_BOT_ID=0JCWF5YS9M
LEX_BOT_ALIAS_ID=TSTALIASID
LEX_LOCALE_ID=en_US
AWS_ACCESS_KEY_ID=REDACTED-AWS-SECRET-0
AWS_SECRET_ACCESS_KEY=REDACTED-AWS-SECRET-1``

## Conclusion

The application when heading to Chatbot, while running the backend server, the application should work and start sending and recieving requests from Lex which is interacting with DynamoDB by using the Lambda function.
>>>>>>> origin/chatbot-sprint2
