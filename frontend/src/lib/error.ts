// Extract a server error message from an API (axios) error, falling back to a
// generic Indonesian message. Keeps error handling uniform across features.
export function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { error?: string } } };
  return axiosErr.response?.data?.error || fallback;
}
