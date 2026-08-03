# Cloud Services Strategy for SAWS

## Reason
We need to figure out the right mix of Backend-as-a-Service (BaaS) and serverless tools for the SmartCare Appointment and Wellness System. The goal is to hit multi-cloud and event-driven design targets without getting drowned in managing servers.

## Setup
* **Handling Users (AWS Cognito):** Cognito is the way to go. It handles OAuth 2.0 right out of the box, and more importantly, it lets us build that custom 3-step MFA flow we need. On top of that, it works and integrates well with API Gateway and Lambda using the JWT tokens.
* **Running Code (AWS Lambda):** Lambda is our glue. It runs backend logic whenever something happens—like a database change, a new queue message, or an authentication step.
* **Storing Data (Amazon DynamoDB):** A NoSQL database is the right choice as it provides sub-millisecond latency and seamless scalability. DynamoDB is perfect for keeping track of user sessions, profile info, and the current status of appointments. Cherry on the cake is that DynamoDB is itself managed and serverless service.
* **Background Messaging (Amazon SQS & SNS):** SQS will hold patient support requests so we don't overwhelm the system and as discussed above it helps in decoupling the architecture along with making it async. Meanwhile, SNS is our broadcasting tool for sending out emails or texts when someone registers, logs in, or books an appointment.
* **Chatbot Brains (Amazon Lex):** Instead of building NLP from scratch, Lex being a managed service excels at what the user wants to do in the chat. It'll connect directly to our Lambda functions to pull info from the database.
* **Understanding Feedback (AWS Comprehend):** Comprehend is a managed service. We just feed in patient text reviews and it automatically figures out if the sentiment is positive or negative. Again, saves us from training our own models.
* **Hosting the UI (AWS Fargate):** We're putting our React app in a container and letting Fargate run it. This way, we don't worry about servers, and it'll scale up if we get a sudden rush of users. However for simplicity we can also place it on AWS S3 if its a static website and serve it via AWS Cloudfront for availability and low latency.

## Multi cloud
* **Dashboards (Google Looker Studio):** For the analytics side, we'll pipe our data logs over to Looker Studio. It's a great way to give Wellness Coordinators a visual breakdown of login stats, popular services, and appointment trends.

---

# Designing the 3-Step Login Process

## The Game Plan
There is a pretty strict security requirement for both Patients and Wellness Coordinators: a mandatory 3-stage login. Here's how I am structuring the flow and keeping track of the user's progress. I also decided to use API Gateway alongside Cognito, as they pair together so well for securing these endpoints.

## Step-by-Step Breakdown
1. **First Hurdle: Username & Password**
   * The user enters their basic credentials into my React app.
   * I shoot that over to AWS Cognito.
   * If it checks out, Cognito hands back a temporary session token. The user isn't fully in yet, just ready for the next test.

2. **Second Hurdle: The Security Question**
   * The app sees the user needs to answer their custom security question and asks it.
   * The user's response gets sent to a Lambda function (hitting an API Gateway endpoint first, which integrates perfectly with my Cognito setup).
   * Lambda checks my `Users` table in DynamoDB to see if the hash matches.
   * If they get it right, Lambda flags the session to move to the final challenge.

3. **Final Hurdle: The Caesar Cipher**
   * A Lambda function creates a random clue (like a healthcare code) and scrambles it using a Caesar shift.
   * I send both the scrambled text and the shift number to the frontend.
   * The user has to decipher it and submit their answer.
   * Lambda checks the work. If it's correct, it tells Cognito everything is good to go, and the user finally gets their JWT to access the app.

## Keeping It Secure
* I'm not giving people forever to do this. I need to set a timer—like 5 minutes tops—to finish all three steps.
* If someone messes up on the security question or the cipher, I kill the session immediately. They have to start all over from step one.

---

# How I'm Deploying: Infrastructure as Code

## Reason
I'm going with Terraform to spin up my AWS and GCP resources. It makes the setup completely reproducible, which is great for showing my work to the TA, and it's basically the industry standard right now. No manual console, everything is defined in code kinda like Git but for infrastructure.

## Folder Structure (Probable draft)
For keeping things tidy here is the probable folder structure :

* `/terraform`
  * `main.tf` (My starting point that pulls in the modules below)
  * `variables.tf` (Things like which region I'm using, environment tags, etc.)
  * `providers.tf` (Setting up connections to AWS and GCP)
  * `/modules`
    * `/auth` (Everything Cognito related)
    * `/compute` (Lambda functions and their permissions)
    * `/database` (DynamoDB setups)
    * `/messaging` (All the SQS queues and SNS topics)
    * `/hosting` (Where I define the Fargate setup and container registries)

---

# System Architecture Notes

## Handling Messages in the Background
* **The Issue:** When a patient submits a concern, we need to pass that to a random Wellness Coordinator. Meanwhile, the frontend UI should not freeze up while waiting for this routing to happen.
* **Probable solution:** 
  1. The React app sends the request over to API Gateway.
  2. API Gateway drops the message straight into an SQS queue, let's say we'll call it `SupportRequestsQueue`. Now the main goal here is to decouple the architecture which can be done using queues or load balancers. But Queues are better buffers and sort of a memory of tasks which is not possible with load balancers.
  3. A Lambda function constantly checks that queue.
  4. When Lambda grabs a message, it looks at our `Coordinators` table in DynamoDB, picks someone who is active at random, and logs the assignment in the `CommunicationLogs` table.
  5. For the real-time chat feature, use WebSockets through API Gateway for a stateful persistent connection.

## Analytics Pipeline
* **Data Ingestion:** Use DynamoDB Streams to catch any changes happening in our tables, like when a new user joins or an appointment gets booked.
* **Formatting:** A Lambda function triggered by the stream. Its job is to clean up the data and save it into an S3 bucket as something readable, like CSV or JSON.
* **Dashboard:** Lastly, Looker Studio will pull that data from S3 to generate all the charts and stats the admins need to see.

---

## References
[1] Amazon Web Services, "Amazon Cognito Developer Guide," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html. [Accessed: Jun. 11, 2026].
[2] Amazon Web Services, "Fanout Amazon SNS notifications to Amazon SQS," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html. [Accessed: Jun. 11, 2026].
[3] Amazon Web Services, "Amazon Lex V2 Developer Guide," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/lex/latest/dg/what-is.html. [Accessed: Jun. 11, 2026].
[4] Google, "Connect to data - Looker Studio Help," Google Help. [Online]. Available: https://support.google.com/looker-studio/answer/6311467. [Accessed: Jun. 11, 2026].
[5] Amazon Web Services, "Custom authentication challenge Lambda triggers," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html. [Accessed: Jun. 11, 2026].
[6] Amazon Web Services, "Amazon DynamoDB API Reference," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Operations_Amazon_DynamoDB.html. [Accessed: Jun. 11, 2026].
[7] HashiCorp, "AWS Provider," Terraform Registry. [Online]. Available: https://registry.terraform.io/providers/hashicorp/aws/latest/docs. [Accessed: Jun. 11, 2026].
[8] HashiCorp, "Backend Type: s3," Terraform Documentation. [Online]. Available: https://developer.hashicorp.com/terraform/language/backend/s3. [Accessed: Jun. 11, 2026].
[9] Amazon Web Services, "Change data capture for DynamoDB Streams," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html. [Accessed: Jun. 11, 2026].
[10] Amazon Web Services, "DetectSentiment - Amazon Comprehend," AWS Documentation. [Online]. Available: https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectSentiment.html. [Accessed: Jun. 11, 2026].
