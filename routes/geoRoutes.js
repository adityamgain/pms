const express = require('express');
const {
  getProvinces,
  getDistricts,
  getMunicipalities,
} = require('../controllers/geoController');

const router = express.Router();

// Define routes
router.get('/provinces', getProvinces);
router.get('/districts/:provinceName', getDistricts);
router.get('/municipalities/:districtName', getMunicipalities);

module.exports = router; // Correct export
