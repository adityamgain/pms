const multer = require('multer');

const storage = multer.memoryStorage(); // Use memory storage instead of disk storage

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel .xlsx
    'application/vnd.ms-excel' // Excel .xls
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: JPEG, PNG, PDF, XLSX, XLS'), false);
  }
};

const upload = multer({
  storage, // Now storing in memory
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // 10MB limit
});

module.exports = upload;
