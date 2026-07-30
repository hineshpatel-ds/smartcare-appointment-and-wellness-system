variable "project_name" { type = string }

variable "sqs_queue_url" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}

variable "users_table_arn" {
  type = string
}

variable "lambda_role_arn" {
  type = string
}
