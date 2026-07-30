exports.processMessage = require('./messaging-functions').processMessage;
exports.dialogflowWebhook = require('./chatbot-functions').dialogflowWebhook;
exports.syncToDynamo = require('./database-mirroring/firestore-to-dynamodb').syncToDynamo;
