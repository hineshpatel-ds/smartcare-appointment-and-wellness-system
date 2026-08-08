const { ses, config } = require('./store');

/**
 * Sends a transactional email via SES. No-ops (with a warning) when
 * SES_SENDER_EMAIL isn't configured, mirroring how the SNS/SQS/Pub-Sub
 * helpers elsewhere in the backend behave when their cloud config is absent
 * -- so local dev keeps working without real AWS credentials.
 */
async function sendEmail(to, subject, html) {
  if (!config.sesSenderEmail) {
    console.warn(`SES not configured, skipping email "${subject}" to ${to}`);
    return { skipped: true };
  }
  if (!to) {
    console.warn(`No recipient address, skipping email "${subject}"`);
    return { skipped: true };
  }
  try {
    await ses
      .sendEmail({
        Source: config.sesSenderEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: html }, Text: { Data: html.replace(/<[^>]+>/g, ' ') } }
        }
      })
      .promise();
    return { sent: true };
  } catch (error) {
    console.warn(`SES send skipped for ${to}: ${error.message}`);
    return { skipped: true, error: error.message };
  }
}

module.exports = { sendEmail };
