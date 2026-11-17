import QRCode from 'qrcode';

export async function generateQRDataURL(text: string, size = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    // The quiet zone is part of the QR spec; one module is too tight for print
    // and made codes unreliable after the card was laminated or photographed.
    margin: 4,
    color: {
      // Pure black gives scanners the strongest contrast in print.
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
