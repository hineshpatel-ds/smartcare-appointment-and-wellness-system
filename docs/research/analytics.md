# Analytics Module Research and Implementation

## Module scope

The analytics module supports platform monitoring, patient engagement insight, appointment trend review, service popularity, and feedback sentiment. In the implemented SAWS system, analytics is available only after login. Patients receive only their own appointment and feedback activity, while wellness coordinators receive platform-level counts and trends.

## Researched options

Cloud-native analytics for this project had three practical options:

- A managed business intelligence tool over operational data, such as Looker Studio connected to exported or replicated data.
- A custom API-driven dashboard, where the backend aggregates DynamoDB and Firestore records and the React UI renders summaries.
- A streaming/event analytics pipeline, where events flow into a warehouse such as BigQuery before dashboarding.

For Sprint 3, the custom API-driven dashboard was the most appropriate because it keeps the analytics experience inside the application and allows role-based filtering before data reaches the browser. Looker Studio remains appropriate for external reports, but it is less suitable for per-user authorization inside the app unless a separate secure data model is added.

## Services used

- Google Cloud Run hosts the analytics-capable Express backend.
- Google Natural Language API is used for feedback sentiment when Google runtime credentials are available.
- DynamoDB stores feedback, appointments, users, services, and login statistics.
- Firestore mirrors operational data for cross-cloud availability and future reporting.
- React renders analytics panels in the authenticated UI.

## Why these services were chosen

Cloud Run fits the analytics API because it provides a managed HTTPS service for the Node.js backend without managing servers. It also integrates naturally with Google client libraries, including Natural Language API.

Google Natural Language API was selected for feedback sentiment because the project requires healthcare service sentiment analysis and the API provides managed sentiment scoring without training a custom model. The backend also includes a heuristic fallback so the app remains demonstrable if the API is unavailable.

DynamoDB is used as the main operational NoSQL store because appointment, feedback, and user records are document-like and fit keyed access patterns. Firestore mirroring adds a second cloud copy and prepares the data for Google-native reporting workflows.

## Current implementation

The backend exposes:

- `POST /feedback` to submit structured feedback.
- `POST /analyze` to analyze arbitrary text.
- `GET /analytics/summary?userId={id}&role={patient|coordinator}` to return scoped analytics.

Authorization behavior:

- Missing login context returns `401`.
- Patient scope filters appointments and feedback by `userId`.
- Coordinator scope includes platform counts, login events, appointment trends, service popularity, and feedback records.

The frontend analytics view is hidden from guests. Appointment history and analytics panels use scrollable containers to keep large datasets usable.

## References

- Google Cloud Natural Language API basics: https://docs.cloud.google.com/natural-language/docs/basics
- Google Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Amazon DynamoDB developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- Firestore product documentation: https://cloud.google.com/products/firestore
- Looker Studio documentation: https://cloud.google.com/looker-studio
