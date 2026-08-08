import { ApiError } from './ApiError'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/**
 * FastAPI error bodies are either `{ detail: "some message" }`
 * (HTTPException) or `{ detail: [{ msg, loc, type }, ...] }` (pydantic
 * validation errors). Reduce either shape down to one display string.
 */
function extractMessage(data, fallback) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join('; ')
  return fallback
}

/**
 * Shared fetch wrapper for every backend call: builds the full URL,
 * JSON-encodes the body when present, JSON-decodes the response, and
 * throws ApiError on a non-2xx response instead of returning it.
 *
 * Args:
 *   path (string): The endpoint path, e.g. "/select" or "/places?region=Tuscany".
 *   options (object): { method?: string, body?: object }.
 *
 * Returns:
 *   Promise<object>: The parsed JSON response body.
 */
export async function fetchJson(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      extractMessage(data, `Request to ${path} failed with status ${response.status}`),
      response.status,
      data?.detail
    )
  }

  return data
}
