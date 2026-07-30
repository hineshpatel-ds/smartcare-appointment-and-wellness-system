resource "aws_dynamodb_table" "appointments" {
  name             = "${var.project_name}-appointments"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "appointmentId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "appointmentId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "services" {
  name         = "${var.project_name}-services"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "serviceId"

  attribute {
    name = "serviceId"
    type = "S"
  }
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/appointment-backend.zip"
}

resource "aws_lambda_function" "book_appointment" {
  function_name    = "${var.project_name}-book-appointment"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "appointment-lambdas/book-appointment.handler"
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 20

  environment {
    variables = {
      PROJECT_NAME       = var.project_name
      APPOINTMENTS_TABLE = aws_dynamodb_table.appointments.name
      SERVICES_TABLE     = aws_dynamodb_table.services.name
      SQS_QUEUE_URL      = var.sqs_queue_url
      SNS_TOPIC_ARN      = var.sns_topic_arn
    }
  }
}

resource "aws_api_gateway_rest_api" "api" {
  name = "${var.project_name}-appointment-api"
}

output "appointments_table_name" {
  value = aws_dynamodb_table.appointments.name
}

output "appointments_table_arn" {
  value = aws_dynamodb_table.appointments.arn
}

output "appointments_table_stream_arn" {
  value = aws_dynamodb_table.appointments.stream_arn
}

output "services_table_name" {
  value = aws_dynamodb_table.services.name
}

output "book_appointment_lambda_arn" {
  value = aws_lambda_function.book_appointment.arn
}

output "api_gateway_id" {
  value = aws_api_gateway_rest_api.api.id
}
