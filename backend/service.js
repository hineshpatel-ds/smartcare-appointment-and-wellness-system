const { config, mirrorToDynamo } = require('./lib/store');
const util = require('./lib/util');
const {
  registerUser,
  confirmRegistration,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  ensureCoordinatorSeed,
  listUsersByRole,
  listDoctors,
  listPendingDoctors,
  decideDoctorApproval,
  updateDoctorSchedule
} = require('./auth-lambdas/users');
const { listServices, upsertService } = require('./appointment-lambdas/services');
const { bookAppointment, listAppointments, updateAppointment } = require('./appointment-lambdas/appointments');
const { submitConcern, assignConcernFromPubSub, listMessages, replyToMessage } = require('./messaging-functions/messages');
const { analyzeSentiment, submitFeedback, feedbackSummary, analyticsSummary } = require('./analytics/feedback');
const { chatbotReply } = require('./chatbot-functions/chatbot');
const { publishNotification } = require('./notifications-lambdas/notify');

module.exports = {
  config,
  jsonResponse: util.jsonResponse,
  parseBody: util.parseBody,
  caesarCipher: util.caesarCipher,
  registerUser,
  confirmRegistration,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  ensureCoordinatorSeed,
  listUsersByRole,
  listDoctors,
  listPendingDoctors,
  decideDoctorApproval,
  updateDoctorSchedule,
  listServices,
  upsertService,
  bookAppointment,
  listAppointments,
  updateAppointment,
  submitConcern,
  assignConcernFromPubSub,
  listMessages,
  replyToMessage,
  submitFeedback,
  feedbackSummary,
  analyzeSentiment,
  analyticsSummary,
  chatbotReply,
  publishNotification,
  mirrorToDynamo
};
