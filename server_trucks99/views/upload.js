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

/** Folders that may be used without a Bearer token (marketplace register). */
const ANON_ALLOWED_FOLDERS = ['user_profile'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function resolveUploadKey(req) {
  return String(req.body?.key || req.query?.key || '').trim();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Prefer body key; fall back to query (FormData text fields can arrive after the file).
    const rawKey = resolveUploadKey(req);

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

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const key = resolveUploadKey(req);
    if (key === 'user_profile') {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(new Error('Please select a valid image file.'));
      }
    }
    cb(null, true);
  },
});

function restrictAnonymousUpload(req, res, next) {
  const isAuth = req.user && req.authenticatedViaBearer;
  if (isAuth) return next();
  const key = String(req.query?.key || '').trim();
  if (!ANON_ALLOWED_FOLDERS.includes(key)) {
    return res.status(401).json({
      message: 'Token missing or expired. Please log in again.',
    });
  }
  next();
}

uploadRouter.post('/', restrictAnonymousUpload, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File must be smaller than 10MB.' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }

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
      folder: resolveUploadKey(req) || 'root',
    });
  });
});

module.exports = uploadRouter;
