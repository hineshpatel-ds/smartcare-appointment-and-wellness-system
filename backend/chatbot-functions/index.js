const { chatbotReply } = require('./chatbot');

exports.dialogflowWebhook = async (req, res) => {
  try {
    const queryResult = req.body.queryResult || {};
    const parameters = queryResult.parameters || {};
    const result = await chatbotReply({
      message: queryResult.queryText || parameters.concern || parameters.message || queryResult.intent?.displayName,
      appointmentId: parameters.appointmentId,
      userId: parameters.patientId
    });
    res.json({ fulfillmentText: result.reply });
  } catch (error) {
    res.json({ fulfillmentText: error.message });
  }
};
