const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const uploadRouter = express.Router();

const uploadRoot = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// ✅ Allowed folders
const allowedFolders = [
  'vehicle_body',
  'vehicle_type',
  'truck_image',
  'truck_rc_doc',
  'user_profile',
  'buy_sell_doc',
  'contact_doc',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Prefer body key; fall back to query (FormData text fields can arrive after the file).
    const rawKey = String(req.body?.key || req.query?.key || "")
      .trim();

    // ✅ validate folder name
    const safeKey = allowedFolders.includes(rawKey) ? rawKey : null;

    const targetDir = safeKey
      ? path.join(uploadRoot, safeKey)
      : uploadRoot;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext);
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stamp = Date.now();

    cb(null, `${safeBase}_${stamp}${ext}`);
  },
});

const upload = multer({ storage });

uploadRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filename = req.file.filename;

  const relDir = path
    .relative(uploadRoot, req.file.destination || uploadRoot)
    .replace(/\\/g, '/');

  const basePath =
    relDir && relDir !== '.'
      ? `/uploads/${relDir}`
      : '/uploads';

  const urlPath = `${basePath}/${filename}`;

  res.status(201).json({
    message: 'File uploaded',
    path: urlPath,
    url: urlPath,
    filename,
    folder: req.body?.key || 'root'
  });
});

module.exports = uploadRouter;