const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const EventWbenificiary = require('../models/EventWbenificiary');
const Project = require('../models/Project');

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dgdbgblvb',
  api_key: '862544784633327',
  api_secret: 'h12L4lhNzkuB1ANCzZpboD0sNgQ'
});

// Cloudinary storage for images and reports
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pmt',
    resource_type: 'auto', // auto-detects file type (image, raw, etc.)
  }
});

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(), // Memory storage for Excel
  fileFilter: (req, file, cb) => {
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
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
