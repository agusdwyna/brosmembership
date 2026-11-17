/**
 * The URL encoded in a card's QR. A phone camera opens the digital card, while
 * the dashboard scanner normalises this URL back to the token (see
 * `backend/src/lib/card-token.ts`) and verifies it as before.
 */
export function cardPublicUrl(qrHash: string): string {
  return `${window.location.origin}/c/${qrHash}`;
}
