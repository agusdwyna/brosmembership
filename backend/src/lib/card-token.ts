/**
 * Cards can carry two kinds of QR payload:
 * - older prints: the raw `qrHash` token (64 hex)
 * - newer prints: the public URL `<origin>/cek/<token>`, so a phone camera opens
 *   the digital card while the dashboard scanner still resolves the same member
 *
 * Both must land on the same value before any lookup. NIK and member numbers
 * are returned untouched.
 */
export function extractCardToken(raw: string): string {
  const value = raw.trim();

  // Match the token segment of a public card URL, with an optional trailing
  // slash / query / fragment.
  // `/cek` is the current route; `/c` was the earlier one and still appears on
  // links shared before the rename, so both must resolve.
  const match = value.match(/\/(?:cek|c)\/([a-f0-9]{64})(?:[/?#].*)?$/i);
  if (match) return match[1];

  // Any other URL-shaped value: take the last path segment when it looks like a
  // token, so a differently hosted link still resolves.
  if (/^https?:\/\//i.test(value)) {
    try {
      const segment = new URL(value).pathname.split('/').filter(Boolean).pop();
      if (segment && /^[a-f0-9]{64}$/i.test(segment)) return segment;
    } catch {
      // Not a valid URL; fall through to the raw value.
    }
  }

  return value;
}
