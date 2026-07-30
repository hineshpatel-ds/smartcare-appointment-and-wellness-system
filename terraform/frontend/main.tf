resource "google_project_service" "run" {
  project            = var.gcp_project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_run_service" "frontend" {
  name     = "${var.project_name}-ui"
  location = var.gcp_region
  project  = var.gcp_project_id

  template {
    spec {
      containers {
        image = var.frontend_image

        ports {
          container_port = 80
        }

        env {
          name  = "API_BASE_URL"
          value = var.api_base_url
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  service  = google_cloud_run_service.frontend.name
  location = google_cloud_run_service.frontend.location
  project  = google_cloud_run_service.frontend.project
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}
