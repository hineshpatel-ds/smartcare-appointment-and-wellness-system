const express = require('express');
const cors = require('cors');
const {
  registerUser,
  confirmRegistration,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  listServices,
  upsertService,
  bookAppointment,
  listAppointments,
  updateAppointment,
  submitConcern,
  listMessages,
  replyToMessage,
  submitFeedback,
  analyzeSentiment,
  analyticsSummary,
  chatbotReply
} = require('./service');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.json(result);
    } catch (error) {
      const message = error.message || 'Request failed';
      const status = message.includes('Authentication required')
        ? 401
        : message.includes('Coordinator access required')
          ? 403
          : ['Invalid', 'required', 'not found', 'upcoming'].some((term) =>
              message.toLowerCase().includes(term.toLowerCase())
            )
              ? 400
              : 500;
      res.status(status).json({ error: message });
    }
  };
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'saws-api' });
});

app.post('/auth/register', asyncRoute((req) => registerUser(req.body)));
app.post('/auth/register/confirm', asyncRoute((req) => confirmRegistration(req.body)));
app.post('/auth/login/start', asyncRoute((req) => startLogin(req.body)));
app.post('/auth/login/security-question', asyncRoute((req) => verifySecurityQuestion(req.body)));
app.post('/auth/login/cipher', asyncRoute((req) => verifyCipher(req.body)));

app.get('/services', asyncRoute(() => listServices()));
app.put('/services/:serviceId', asyncRoute((req) => upsertService({ ...req.body, serviceId: req.params.serviceId })));
app.post('/services', asyncRoute((req) => upsertService(req.body)));

app.post('/appointments', asyncRoute((req) => bookAppointment(req.body)));
app.get('/appointments', asyncRoute((req) => listAppointments(req.query)));
app.patch('/appointments/:appointmentId', asyncRoute((req) => updateAppointment(req.params.appointmentId, req.body)));

app.post('/messages/support', asyncRoute((req) => submitConcern(req.body)));
app.get('/messages', asyncRoute((req) => listMessages(req.query)));
app.post('/messages/:messageId/reply', asyncRoute((req) => replyToMessage(req.params.messageId, req.body)));

app.post('/chatbot', asyncRoute((req) => chatbotReply(req.body)));
app.post('/feedback', asyncRoute((req) => submitFeedback(req.body)));
app.post('/analyze', asyncRoute((req) => analyzeSentiment(req.body.text)));
app.get('/analytics/summary', asyncRoute((req) => analyticsSummary(req.query)));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`SAWS API listening on port ${port}`);
});
