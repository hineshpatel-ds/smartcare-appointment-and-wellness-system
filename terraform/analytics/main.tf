resource "google_project_service" "run" {
  project            = var.gcp_project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "language_api" {
  project            = var.gcp_project_id
  service            = "language.googleapis.com"
  disable_on_destroy = false
}

resource "aws_dynamodb_table" "feedback" {
  name         = "${var.project_name}-feedback"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "feedbackId"

  attribute {
    name = "feedbackId"
    type = "S"
  }
}

resource "google_cloud_run_service" "api" {
  name     = "${var.project_name}-api"
  location = var.gcp_region
  project  = var.gcp_project_id

  template {
    spec {
      containers {
        image = var.backend_image

        env {
          name  = "PROJECT_NAME"
          value = var.project_name
        }
        env {
          name  = "AWS_REGION"
          value = var.aws_region
        }
        env {
          name  = "AWS_ACCESS_KEY_ID"
          value = var.aws_access_key_id
        }
        env {
          name  = "AWS_SECRET_ACCESS_KEY"
          value = var.aws_secret_access_key
        }
        env {
          name  = "AWS_SESSION_TOKEN"
          value = var.aws_session_token
        }
        env {
          name  = "USERS_TABLE"
          value = var.users_table
        }
        env {
          name  = "APPOINTMENTS_TABLE"
          value = var.appointments_table
        }
        env {
          name  = "FEEDBACK_TABLE"
          value = aws_dynamodb_table.feedback.name
        }
        env {
          name  = "MESSAGES_TABLE"
          value = var.messages_table
        }
        env {
          name  = "SERVICES_TABLE"
          value = var.services_table
        }
        env {
          name  = "LOGIN_STATS_TABLE"
          value = var.login_stats_table
        }
        env {
          name  = "COGNITO_USER_POOL_ID"
          value = var.cognito_user_pool_id
        }
        env {
          name  = "COGNITO_CLIENT_ID"
          value = var.cognito_client_id
        }
        env {
          name  = "SQS_QUEUE_URL"
          value = var.sqs_queue_url
        }
        env {
          name  = "SNS_TOPIC_ARN"
          value = var.sns_topic_arn
        }
        env {
          name  = "PUBSUB_TOPIC"
          value = var.pubsub_topic
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.run,
    google_project_service.language_api
  ]
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  project  = google_cloud_run_service.api.project
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "api_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "feedback_table_name" {
  value = aws_dynamodb_table.feedback.name
}
