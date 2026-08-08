terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Remote state so `terraform apply` (locally and in CI) always reads/writes
  # the same state instead of starting from a blank local state file every
  # run. Bucket/table names are environment-specific and must be created out
  # of band (S3 bucket with versioning, DynamoDB table with a "LockID" hash
  # key), then supplied at `terraform init` time, e.g.:
  #   terraform init -backend-config=backend.hcl
  # See backend.hcl.example for the expected keys. Terraform backend blocks
  # cannot reference variables, which is why these are left blank here.
  backend "s3" {}
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id != "" ? var.aws_access_key_id : null
  secret_key = var.aws_secret_access_key != "" ? var.aws_secret_access_key : null
  token      = var.aws_session_token != "" ? var.aws_session_token : null
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}
