/**
 * Reusable fetch wrapper that:
 * - Checks response.ok
 * - Returns JSON
 * - Throws standardized error object { status, message }
 */
export async function http(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = new Error(`HTTP Error: ${response.statusText || 'Request failed'}`);
    error.status = response.status;
    error.message = response.statusText || `Request failed with status ${response.status}`;

    // Try to get error details from response body if available
    try {
      const errorData = await response.json();
      if (errorData.message) {
        error.message = errorData.message;
      }
    } catch {
      // If response body isn't JSON, use default message
    }

    throw error;
  }

  return response.json();
}
