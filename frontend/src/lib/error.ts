/** Shape of the API's failure body (see backend error-handler). */
interface ApiErrorBody {
  error?: string;
  details?: { field: string; message: string }[];
}

/**
 * Extract a server error message from an API (axios) error, falling back to a
 * generic Indonesian message. Keeps error handling uniform across features.
 *
 * Validation failures arrive as `{ error: 'Validasi gagal', details: [...] }`.
 * Returning only `error` showed the same useless sentence for every bad field,
 * so the first field message is appended — the operator needs to know *what*
 * to fix.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  if (!body) return fallback;

  const headline = body.error || fallback;
  const firstDetail = body.details?.[0];
  if (!firstDetail) return headline;

  const label = firstDetail.field ? `${firstDetail.field}: ` : '';
  return `${headline} (${label}${firstDetail.message})`;
}
