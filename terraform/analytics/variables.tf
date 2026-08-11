variable "project_name" { type = string }
variable "gcp_project_id" { type = string }
variable "gcp_region" { type = string }
variable "backend_image" { type = string }
variable "aws_region" { type = string }
variable "aws_access_key_id" {
  type      = string
  sensitive = true
}
variable "aws_secret_access_key" {
  type      = string
  sensitive = true
}
variable "aws_session_token" {
  type      = string
  sensitive = true
}
variable "users_table" { type = string }
variable "appointments_table" { type = string }
variable "messages_table" { type = string }
variable "services_table" { type = string }
variable "login_stats_table" { type = string }
variable "cognito_user_pool_id" { type = string }
variable "cognito_client_id" { type = string }
variable "sqs_queue_url" { type = string }
variable "sns_topic_arn" { type = string }
variable "pubsub_topic" { type = string }
variable "coordinator_user_id" {
  type      = string
  default   = ""
  sensitive = true
}
variable "coordinator_email" {
  type      = string
  default   = ""
  sensitive = true
}
variable "coordinator_password" {
  type      = string
  default   = ""
  sensitive = true
}
variable "coordinator_security_question" {
  type      = string
  default   = ""
  sensitive = true
}
variable "coordinator_security_answer" {
  type      = string
  default   = ""
  sensitive = true
}
variable "coordinator_healthcare_code" {
  type      = string
  default   = ""
  sensitive = true
}
