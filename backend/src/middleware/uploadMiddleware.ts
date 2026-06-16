import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Hash the filename
    const hash = crypto.createHash('sha256');
    hash.update(file.originalname + Date.now().toString());
    const hashedName = hash.digest('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${hashedName}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});
