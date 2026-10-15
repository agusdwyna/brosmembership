import QRCode from 'qrcode';

export async function generateQRDataURL(text: string, size = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: {
      dark: '#3A3F52',
      light: '#FFFFFF',
    },
  });
}
