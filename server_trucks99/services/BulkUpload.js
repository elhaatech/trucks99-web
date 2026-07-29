const multer = require("multer");

// Keep file in memory (no need to write to disk) - good for small/medium excel files
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx or .xls files are allowed"));
    }
  },
});

module.exports = upload;