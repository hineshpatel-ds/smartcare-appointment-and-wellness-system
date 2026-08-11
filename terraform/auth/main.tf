resource "aws_cognito_user_pool" "user_pool" {
  name = "${var.project_name}-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "role"
    required            = false
    mutable             = true
  }

  lifecycle {
    ignore_changes = [schema]
  }
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  name                = "${var.project_name}-client"
  user_pool_id        = aws_cognito_user_pool.user_pool.id
  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]
}

resource "aws_dynamodb_table" "users" {
  name             = "${var.project_name}-users"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "userId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "login_stats" {
  name         = "${var.project_name}-login-stats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "loginId"

  attribute {
    name = "loginId"
    type = "S"
  }
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/auth-backend.zip"
  excludes    = ["node_modules/**", "*.zip"]
}

resource "aws_lambda_function" "second_stage" {
  function_name    = "${var.project_name}-auth-second-stage"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "auth-lambdas/second-stage.handler"
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      USERS_TABLE  = aws_dynamodb_table.users.name
    }
  }
}

resource "aws_lambda_function" "third_stage" {
  function_name    = "${var.project_name}-auth-third-stage"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "auth-lambdas/third-stage.handler"
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      USERS_TABLE  = aws_dynamodb_table.users.name
    }
  }
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.user_pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.user_pool_client.id
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "users_table_stream_arn" {
  value = aws_dynamodb_table.users.stream_arn
}

output "login_stats_table_name" {
  value = aws_dynamodb_table.login_stats.name
}

output "second_stage_lambda_arn" {
  value = aws_lambda_function.second_stage.arn
}

output "third_stage_lambda_arn" {
  value = aws_lambda_function.third_stage.arn
}
