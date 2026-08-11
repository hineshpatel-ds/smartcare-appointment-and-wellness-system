const { config, memory, scanItems, putItem, mirrorToFirestore, hasGoogleRuntimeCredentials } = require('../lib/store');
const { createId, nowIso, requireSignedInContext } = require('../lib/util');
const { listServices } = require('../appointment-lambdas/services');

let languageClient = null;
if (hasGoogleRuntimeCredentials) {
  try {
    const language = require('@google-cloud/language');
    languageClient = new language.LanguageServiceClient();
  } catch (error) {
    languageClient = null;
  }
}

function heuristicSentiment(text) {
  const positive = ['good', 'great', 'excellent', 'helpful', 'quick', 'happy', 'smooth', 'clear'];
  const negative = ['bad', 'slow', 'late', 'poor', 'confusing', 'unhappy', 'issue', 'problem'];
  const value = String(text || '').toLowerCase();
  const score = positive.reduce((total, word) => total + (value.includes(word) ? 0.2 : 0), 0)
    - negative.reduce((total, word) => total + (value.includes(word) ? 0.25 : 0), 0);
  return {
    score: Math.max(-1, Math.min(1, Number(score.toFixed(2)))),
    magnitude: Math.min(1, Math.abs(score) + 0.15)
  };
}

async function analyzeSentiment(text) {
  if (languageClient) {
    try {
      const [result] = await languageClient.analyzeSentiment({
        document: { content: text, type: 'PLAIN_TEXT' }
      });
      return result.documentSentiment;
    } catch (error) {
      console.warn(`Natural Language API fallback: ${error.message}`);
    }
  }
  return heuristicSentiment(text);
}

async function submitFeedback(input) {
  if (!input.userId || !input.service || !input.rating || !input.comment) {
    throw new Error('userId, service, rating, and comment are required');
  }
  const sentiment = await analyzeSentiment(input.comment);
  const feedback = {
    feedbackId: createId('fb'),
    userId: input.userId,
    service: input.service,
    rating: Number(input.rating),
    comment: input.comment,
    sentimentScore: Number(sentiment.score || 0),
    sentimentMagnitude: Number(sentiment.magnitude || 0),
    createdAt: nowIso()
  };
  await putItem(config.feedbackTable, 'feedbackId', feedback, memory.feedback);
  await mirrorToFirestore('feedback', feedback.feedbackId, feedback);
  return feedback;
}

async function feedbackSummary() {
  const feedback = await scanItems(config.feedbackTable, memory.feedback);
  if (!feedback.length) {
    return { totalReviews: 0, averageRating: 0, averageSentiment: 0, perService: {}, recent: [] };
  }

  const averageRating = feedback.reduce((total, item) => total + Number(item.rating || 0), 0) / feedback.length;
  const averageSentiment = feedback.reduce((total, item) => total + Number(item.sentimentScore || 0), 0) / feedback.length;

  const perService = feedback.reduce((acc, item) => {
    const bucket = acc[item.service] || { count: 0, ratingTotal: 0, sentimentTotal: 0 };
    bucket.count += 1;
    bucket.ratingTotal += Number(item.rating || 0);
    bucket.sentimentTotal += Number(item.sentimentScore || 0);
    acc[item.service] = bucket;
    return acc;
  }, {});
  const perServiceSummary = Object.fromEntries(
    Object.entries(perService).map(([service, bucket]) => [
      service,
      {
        count: bucket.count,
        averageRating: Number((bucket.ratingTotal / bucket.count).toFixed(2)),
        averageSentiment: Number((bucket.sentimentTotal / bucket.count).toFixed(2))
      }
    ])
  );

  const recent = [...feedback]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((item) => ({
      service: item.service,
      rating: item.rating,
      comment: item.comment,
      sentimentScore: item.sentimentScore
    }));

  return {
    totalReviews: feedback.length,
    averageRating: Number(averageRating.toFixed(2)),
    averageSentiment: Number(averageSentiment.toFixed(2)),
    perService: perServiceSummary,
    recent
  };
}

async function analyticsSummary({ userId, role } = {}) {
  requireSignedInContext({ userId, role });
  const [users, appointments, feedback, services] = await Promise.all([
    scanItems(config.usersTable, memory.users),
    scanItems(config.appointmentsTable, memory.appointments),
    scanItems(config.feedbackTable, memory.feedback),
    listServices()
  ]);

  const visibleAppointments =
    role === 'patient'
      ? appointments.filter((item) => item.userId === userId)
      : role === 'doctor'
        ? appointments.filter((item) => item.doctorId === userId)
        : appointments;
  const visibleFeedback = role === 'patient' ? feedback.filter((item) => item.userId === userId) : role === 'coordinator' ? feedback : [];

  const appointmentTrends = visibleAppointments.reduce((acc, item) => {
    acc[item.date] = (acc[item.date] || 0) + 1;
    return acc;
  }, {});
  const servicePopularity = visibleAppointments.reduce((acc, item) => {
    acc[item.service] = (acc[item.service] || 0) + 1;
    return acc;
  }, {});

  const loginStats = await scanItems(config.loginStatsTable, memory.loginStats);

  return {
    scope: role,
    totalPatients: role === 'coordinator' ? users.filter((user) => user.role === 'patient').length : undefined,
    totalDoctors: role === 'coordinator' ? users.filter((user) => user.role === 'doctor' && user.status === 'ACTIVE').length : undefined,
    pendingDoctorApprovals:
      role === 'coordinator' ? users.filter((user) => user.role === 'doctor' && user.status === 'PENDING_APPROVAL').length : undefined,
    loginCount: role === 'coordinator' ? loginStats.length : undefined,
    appointmentCount: visibleAppointments.length,
    pendingAppointments: visibleAppointments.filter((item) => item.status === 'PENDING_APPROVAL').length,
    services,
    appointmentTrends,
    servicePopularity,
    feedback: visibleFeedback
  };
}

module.exports = { analyzeSentiment, submitFeedback, feedbackSummary, analyticsSummary };

