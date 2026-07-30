const { jsonResponse, parseBody, verifyCipher } = require('../service');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  try {
    const result = await verifyCipher(parseBody(event));
    return jsonResponse(200, { message: '3rd stage auth successful', ...result });
  } catch (error) {
    return jsonResponse(403, { message: error.message });
  }
};
