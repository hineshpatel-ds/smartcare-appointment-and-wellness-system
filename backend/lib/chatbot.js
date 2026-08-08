const { config, memory, getItem } = require('./store');
const { listServices } = require('./services');
const { listAppointments } = require('./appointments');
const { submitConcern } = require('./messages');

async function chatbotReply(input) {
  const message = String(input.message || '').toLowerCase();
  if (!message) throw new Error('message is required');

  const codeMatch = message.match(/apt-[a-z0-9-]+/i);
  const appointmentId = input.appointmentId || (codeMatch && codeMatch[0]);

  if (appointmentId) {
    const appointment = await getItem(config.appointmentsTable, { appointmentId }, memory.appointments);
    if (!appointment) return { reply: 'I could not find that appointment reference code.' };
    return {
      reply: `Appointment ${appointment.appointmentId}: ${appointment.service} on ${appointment.date} at ${appointment.time} with ${appointment.doctorName || 'an assigned specialist'}. Status: ${appointment.status}.`
    };
  }

  const asksForOwnAppointments =
    (message.includes('my appointment') || message.includes('reference code') || message.includes('my booking')) && !codeMatch;
  if (asksForOwnAppointments && input.userId && input.role) {
    const appointments = await listAppointments({ userId: input.userId, role: input.role });
    if (!appointments.length) return { reply: "You don't have any appointments yet." };
    return {
      reply: appointments
        .map((item) => `${item.appointmentId} - ${item.service} on ${item.date} at ${item.time} (${item.status})`)
        .join(' | ')
    };
  }

  if (message.includes('appointment')) {
    return { reply: 'Please provide your appointment reference code, for example apt-123.' };
  }

  if (message.includes('package') || message.includes('price') || message.includes('service')) {
    const services = await listServices();
    return {
      reply: services.map((service) => `${service.name} costs $${service.price}`).join(' | ')
    };
  }

  if (message.includes('concern') || message.includes('support') || message.includes('help')) {
    const concern = await submitConcern({
      userId: input.userId || 'guest',
      subject: 'Chatbot concern',
      message: input.message
    });
    return {
      reply: `I forwarded your concern to a wellness coordinator. Reference: ${concern.messageId}.`
    };
  }

  if (message.includes('where') || message.includes('navigate') || message.includes('dashboard')) {
    return {
      reply: 'Use Services to review care options, Doctors to see specialists and availability, Dashboard to book and track appointments, Messages for support, and Analytics to view feedback trends.'
    };
  }

  return {
    reply: 'I can help with navigation, appointment lookup, wellness package pricing, FAQs, and support concerns.'
  };
}

module.exports = { chatbotReply };
