variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_access_key_id" {
  type        = string
  description = "AWS access key for GCP workloads that call AWS APIs. Prefer short-lived lab credentials."
  default     = ""
  sensitive   = true
}

variable "aws_secret_access_key" {
  type        = string
  description = "AWS secret key for GCP workloads that call AWS APIs."
  default     = ""
  sensitive   = true
}

variable "aws_session_token" {
  type        = string
  description = "Optional AWS session token for temporary credentials."
  default     = ""
  sensitive   = true
}

variable "lambda_role_arn" {
  type        = string
  description = "Existing AWS IAM role ARN used by Lambda functions in restricted lab accounts."
  default     = "arn:aws:iam::839337112204:role/LabRole"
}

variable "gcp_project_id" {
  type = string
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
}

variable "project_name" {
  type    = string
  default = "saws"
}

variable "frontend_image" {
  type        = string
  description = "Container image for the React frontend."
  default     = null
}

variable "backend_image" {
  type        = string
  description = "Container image for the SAWS backend/API Cloud Run service."
  default     = null
}
