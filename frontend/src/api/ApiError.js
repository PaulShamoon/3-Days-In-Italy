/**
 * Thrown by client.js when a backend response is not ok. Carries the
 * HTTP status and FastAPI's parsed `detail` payload (string, or a
 * pydantic validation error array) so callers can branch on status if
 * needed rather than just showing a generic message.
 */
export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}
