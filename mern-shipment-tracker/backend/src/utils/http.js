export function badRequest(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = details;
  return error;
}
