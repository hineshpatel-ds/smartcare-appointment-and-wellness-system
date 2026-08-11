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

resource "aws_sns_topic_subscription" "appointment_queue" {
  topic_arn            = aws_sns_topic.notifications.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.appointment_requests.arn
  raw_message_delivery = false
}

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.module}/notifications-backend.zip"
}

# Table names are derived by convention instead of taking module outputs
# from the appointment/auth modules, because the appointment module already
# depends on this notifications module for its SQS/SNS ARNs -- taking a
# reference back would create a circular module dependency.
locals {
  appointments_table_name = "${var.project_name}-appointments"
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
      PROJECT_NAME       = var.project_name
      SNS_TOPIC_ARN      = aws_sns_topic.notifications.arn
      APPOINTMENTS_TABLE = local.appointments_table_name
    }
  }
}

resource "aws_lambda_event_source_mapping" "appointment_queue" {
  event_source_arn = aws_sqs_queue.appointment_requests.arn
  function_name    = aws_lambda_function.process_sqs.arn
  batch_size       = 5
}

resource "aws_lambda_function" "send_reminders" {
  function_name    = "${var.project_name}-send-reminders"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "notifications-lambdas/send-reminders.handler"
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      PROJECT_NAME            = var.project_name
      SNS_TOPIC_ARN           = aws_sns_topic.notifications.arn
      APPOINTMENTS_TABLE      = local.appointments_table_name
      REMINDER_WINDOW_MINUTES = "30"
    }
  }
}

# Classic EventBridge rule (rather than the newer EventBridge Scheduler)
# because it invokes the Lambda via a resource-based permission instead of
# a dedicated execution role -- the project only has a single fixed LabRole
# available in restricted lab accounts, and that role isn't guaranteed to
# have a trust policy for scheduler.amazonaws.com.
resource "aws_cloudwatch_event_rule" "appointment_reminders" {
  name                = "${var.project_name}-appointment-reminders"
  description         = "Periodically scans for upcoming confirmed appointments and sends reminder notifications through SNS."
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "appointment_reminders" {
  rule = aws_cloudwatch_event_rule.appointment_reminders.name
  arn  = aws_lambda_function.send_reminders.arn
}

resource "aws_lambda_permission" "allow_eventbridge_reminders" {
  statement_id  = "AllowEventBridgeInvokeReminders"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_reminders.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.appointment_reminders.arn
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
