resource "google_project_service" "dialogflow" {
  project            = var.gcp_project_id
  service            = "dialogflow.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudfunctions" {
  project            = var.gcp_project_id
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_dialogflow_agent" "agent" {
  project               = var.gcp_project_id
  display_name          = "${var.project_name}-bot"
  default_language_code = "en"
  time_zone             = "America/Halifax"

  depends_on = [google_project_service.dialogflow]
}

resource "google_dialogflow_intent" "navigation" {
  project      = var.gcp_project_id
  display_name = "Navigation"

  depends_on = [google_dialogflow_agent.agent]
}

resource "google_dialogflow_intent" "appointment_lookup" {
  project      = var.gcp_project_id
  display_name = "Check Appointment"

  webhook_state = "WEBHOOK_STATE_ENABLED"
  depends_on    = [google_dialogflow_agent.agent]
}

resource "google_dialogflow_intent" "wellness_package" {
  project      = var.gcp_project_id
  display_name = "Wellness Package"

  webhook_state = "WEBHOOK_STATE_ENABLED"
  depends_on    = [google_dialogflow_agent.agent]
}

resource "google_dialogflow_intent" "submit_concern" {
  project      = var.gcp_project_id
  display_name = "Submit Concern"

  webhook_state = "WEBHOOK_STATE_ENABLED"
  depends_on    = [google_dialogflow_agent.agent]
}

resource "google_storage_bucket" "function_source" {
  name                        = "${var.gcp_project_id}-${var.project_name}-chatbot-functions"
  project                     = var.gcp_project_id
  location                    = var.gcp_region
  uniform_bucket_level_access = true
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/chatbot-backend.zip"
  excludes    = ["node_modules/**", "*.zip"]
}

resource "google_storage_bucket_object" "source" {
  name   = "chatbot-${data.archive_file.backend_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.backend_zip.output_path
}

resource "google_cloudfunctions_function" "webhook" {
  name                  = "${var.project_name}-dialogflow-webhook"
  project               = var.gcp_project_id
  region                = var.gcp_region
  runtime               = "nodejs20"
  source_archive_bucket = google_storage_bucket.function_source.name
  source_archive_object = google_storage_bucket_object.source.name
  entry_point           = "dialogflowWebhook"
  trigger_http          = true
  available_memory_mb   = 256
  timeout               = 60

  environment_variables = {
    PROJECT_NAME = var.project_name
    PUBSUB_TOPIC = var.pubsub_topic
  }

  depends_on = [google_project_service.cloudfunctions]
}

resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = var.gcp_project_id
  region         = var.gcp_region
  cloud_function = google_cloudfunctions_function.webhook.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

resource "google_dialogflow_fulfillment" "webhook" {
  project      = var.gcp_project_id
  display_name = "${var.project_name}-webhook"
  enabled      = true

  generic_web_service {
    uri = google_cloudfunctions_function.webhook.https_trigger_url
  }

  depends_on = [google_dialogflow_agent.agent]
}

output "dialogflow_agent_id" {
  value = google_dialogflow_agent.agent.id
}

output "dialogflow_webhook_url" {
  value = google_cloudfunctions_function.webhook.https_trigger_url
}
