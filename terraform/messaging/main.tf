resource "google_project_service" "pubsub" {
  project            = var.gcp_project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  project            = var.gcp_project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudfunctions" {
  project            = var.gcp_project_id
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_pubsub_topic" "support_concerns" {
  name    = "${var.project_name}-support-concerns"
  project = var.gcp_project_id

  depends_on = [google_project_service.pubsub]
}

resource "google_firestore_database" "database" {
  project     = var.gcp_project_id
  name        = "(default)"
  location_id = var.gcp_region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

resource "aws_dynamodb_table" "support_messages" {
  name         = "${var.project_name}-support-messages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "messageId"

  attribute {
    name = "messageId"
    type = "S"
  }
}

resource "google_storage_bucket" "function_source" {
  name                        = "${var.gcp_project_id}-${var.project_name}-functions"
  project                     = var.gcp_project_id
  location                    = var.gcp_region
  uniform_bucket_level_access = true
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/messaging-backend.zip"
  excludes    = ["node_modules/**", "*.zip"]
}

resource "google_storage_bucket_object" "source" {
  name   = "messaging-${data.archive_file.backend_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.backend_zip.output_path
}

resource "google_cloudfunctions_function" "process_message" {
  name                  = "${var.project_name}-process-message"
  project               = var.gcp_project_id
  region                = var.gcp_region
  runtime               = "nodejs20"
  source_archive_bucket = google_storage_bucket.function_source.name
  source_archive_object = google_storage_bucket_object.source.name
  entry_point           = "processMessage"
  available_memory_mb   = 256
  timeout               = 60

  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.support_concerns.name
  }

  environment_variables = {
    PROJECT_NAME          = var.project_name
    PUBSUB_TOPIC          = google_pubsub_topic.support_concerns.name
    MESSAGES_TABLE        = aws_dynamodb_table.support_messages.name
    AWS_REGION            = var.aws_region
    AWS_ACCESS_KEY_ID     = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key
    AWS_SESSION_TOKEN     = var.aws_session_token
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_firestore_database.database
  ]
}

resource "google_cloudfunctions_function" "firestore_to_dynamodb" {
  name                  = "${var.project_name}-firestore-to-dynamodb"
  project               = var.gcp_project_id
  region                = var.gcp_region
  runtime               = "nodejs20"
  source_archive_bucket = google_storage_bucket.function_source.name
  source_archive_object = google_storage_bucket_object.source.name
  entry_point           = "syncToDynamo"
  available_memory_mb   = 256
  timeout               = 60

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "projects/${var.gcp_project_id}/databases/(default)/documents/{collection}/{documentId}"
  }

  environment_variables = {
    PROJECT_NAME          = var.project_name
    AWS_REGION            = var.aws_region
    AWS_ACCESS_KEY_ID     = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key
    AWS_SESSION_TOKEN     = var.aws_session_token
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_firestore_database.database
  ]
}

output "pubsub_topic_name" {
  value = google_pubsub_topic.support_concerns.name
}

output "messages_table_name" {
  value = aws_dynamodb_table.support_messages.name
}

output "firestore_database_name" {
  value = google_firestore_database.database.name
}
