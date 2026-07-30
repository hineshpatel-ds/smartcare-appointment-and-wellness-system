module "notifications" {
  source          = "./notifications"
  project_name    = var.project_name
  lambda_role_arn = var.lambda_role_arn
}

module "auth" {
  source          = "./auth"
  project_name    = var.project_name
  lambda_role_arn = var.lambda_role_arn
}

module "messaging" {
  source                = "./messaging"
  project_name          = var.project_name
  gcp_project_id        = var.gcp_project_id
  gcp_region            = var.gcp_region
  aws_region            = var.aws_region
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  aws_session_token     = var.aws_session_token
}

module "appointment" {
  source          = "./appointment"
  project_name    = var.project_name
  sqs_queue_url   = module.notifications.sqs_queue_url
  sns_topic_arn   = module.notifications.sns_topic_arn
  users_table_arn = module.auth.users_table_arn
  lambda_role_arn = var.lambda_role_arn
}

module "chatbot" {
  source         = "./chatbot"
  project_name   = var.project_name
  gcp_project_id = var.gcp_project_id
  gcp_region     = var.gcp_region
  pubsub_topic   = module.messaging.pubsub_topic_name
}

module "analytics" {
  source                = "./analytics"
  project_name          = var.project_name
  gcp_project_id        = var.gcp_project_id
  gcp_region            = var.gcp_region
  backend_image         = coalesce(var.backend_image, "gcr.io/${var.gcp_project_id}/${var.project_name}-analytics:latest")
  aws_region            = var.aws_region
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  aws_session_token     = var.aws_session_token
  users_table           = module.auth.users_table_name
  appointments_table    = module.appointment.appointments_table_name
  messages_table        = module.messaging.messages_table_name
  services_table        = module.appointment.services_table_name
  login_stats_table     = module.auth.login_stats_table_name
  cognito_user_pool_id  = module.auth.cognito_user_pool_id
  cognito_client_id     = module.auth.cognito_client_id
  sqs_queue_url         = module.notifications.sqs_queue_url
  sns_topic_arn         = module.notifications.sns_topic_arn
  pubsub_topic          = module.messaging.pubsub_topic_name
}

module "frontend" {
  source         = "./frontend"
  project_name   = var.project_name
  gcp_project_id = var.gcp_project_id
  gcp_region     = var.gcp_region
  frontend_image = coalesce(var.frontend_image, "gcr.io/${var.gcp_project_id}/${var.project_name}-frontend:latest")
  api_base_url   = module.analytics.api_url
}

output "frontend_url" {
  value = module.frontend.frontend_url
}

output "api_url" {
  value = module.analytics.api_url
}

output "cognito_user_pool_id" {
  value = module.auth.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.auth.cognito_client_id
}
