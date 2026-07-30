const { jsonResponse, parseBody, bookAppointment } = require('../service');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  try {
    const appointment = await bookAppointment(parseBody(event));
    return jsonResponse(200, { message: 'Appointment requested successfully', appointment });
  } catch (error) {
    return jsonResponse(400, { message: error.message });
  }
};
