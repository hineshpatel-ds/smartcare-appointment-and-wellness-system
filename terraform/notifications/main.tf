resource "aws_sns_topic" "notifications" {
  name = "${var.project_name}-notifications"
}

resource "aws_sqs_queue" "appointment_requests" {
  name                       = "${var.project_name}-appointment-requests"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
}

resource "aws_sqs_queue_policy" "appointment_requests" {
  queue_url = aws_sqs_queue.appointment_requests.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "sns.amazonaws.com"
      }
      Action   = "sqs:SendMessage"
      Resource = aws_sqs_queue.appointment_requests.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.notifications.arn
        }
      }
    }]
  })
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/notifications-backend.zip"
}

resource "aws_lambda_function" "process_sqs" {
  function_name    = "${var.project_name}-process-notifications"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "notifications-lambdas/process-sqs.handler"
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      PROJECT_NAME  = var.project_name
      SNS_TOPIC_ARN = aws_sns_topic.notifications.arn
    }
  }
}

resource "aws_lambda_event_source_mapping" "appointment_queue" {
  event_source_arn = aws_sqs_queue.appointment_requests.arn
  function_name    = aws_lambda_function.process_sqs.arn
  batch_size       = 5
}

output "sns_topic_arn" {
  value = aws_sns_topic.notifications.arn
}

output "sqs_queue_url" {
  value = aws_sqs_queue.appointment_requests.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.appointment_requests.arn
}
