const multer = require('multer');
const path = require('path');

// Set up file storage and file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`); // Rename files to avoid conflicts
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']; // Example file types
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Allow the file
  } else {
    cb(new Error('Invalid file type'), false); // Reject the file
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
