import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Only raster images are accepted. SVG is deliberately excluded: it can carry
// <script>, and uploaded files are served same-origin from /uploads.
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Identify an accepted raster image from its magic bytes (never the filename). */
function sniffImage(buffer: Buffer): { ext: string; mime: string } | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

// Buffer in memory so the bytes can be validated before anything hits disk
// under a name derived from the client's (untrusted) filename.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    // Cheap early rejection to avoid buffering non-images; the authoritative
    // check is the magic-byte sniff in saveUploadedImage.
    cb(null, file.mimetype.startsWith('image/'));
  },
});

/**
 * Validate a buffered upload by magic bytes and persist it under a random
 * filename with a safe extension. Returns the public URL, or null when the
 * bytes are not an accepted raster image.
 */
export function saveUploadedImage(file: Express.Multer.File): string | null {
  const type = sniffImage(file.buffer);
  if (!type) return null;
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${type.ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
}
