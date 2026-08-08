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
} = require('./lib/users');
const { listServices, upsertService } = require('./lib/services');
const { bookAppointment, listAppointments, updateAppointment } = require('./lib/appointments');
const { submitConcern, assignConcernFromPubSub, listMessages, replyToMessage } = require('./lib/messages');
const { analyzeSentiment, submitFeedback, feedbackSummary, analyticsSummary } = require('./lib/feedback');
const { chatbotReply } = require('./lib/chatbot');
const { publishNotification } = require('./lib/notify');

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
