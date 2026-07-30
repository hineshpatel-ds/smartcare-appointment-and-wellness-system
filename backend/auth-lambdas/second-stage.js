const { jsonResponse, parseBody, verifySecurityQuestion } = require('../service');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  try {
    const result = await verifySecurityQuestion(parseBody(event));
    return jsonResponse(200, { message: '2nd stage auth successful', ...result });
  } catch (error) {
    return jsonResponse(403, { message: error.message });
  }
};
