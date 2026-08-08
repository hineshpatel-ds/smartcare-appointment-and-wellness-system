variable "project_name" { type = string }

variable "lambda_role_arn" { type = string }

variable "ses_sender_email" {
  type        = string
  description = "Verified SES sender address. When empty, no SES identity is created and reminder emails no-op."
  default     = ""
}
