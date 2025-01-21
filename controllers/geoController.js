// controllers/geoController.js
const nepalGeoData = require('@nepalutils/nepal-geodata');

// Get all provinces
const getProvinces = async (req, res) => {
  try {
    const nepalData = await nepalGeoData('english'); // Fetch data in English
    const provinces = Object.keys(nepalData).map((province) => ({
      name: province, // Province name
    }));
    res.json(provinces); // Return the formatted provinces as JSON
  } catch (error) {
    console.error('Error fetching provinces:', error);
    res.status(500).send('Error fetching provinces');
  }
};

// Get districts for a specific province
const getDistricts = async (req, res) => {
  try {
    const provinceName = req.params.provinceName.trim(); // No need for `toLowerCase`
    const nepalData = await nepalGeoData('english'); // Fetch data in English

    // Find the province (case-insensitive match)
    const provinceKey = Object.keys(nepalData).find(
      (key) => key.toLowerCase() === provinceName.toLowerCase()
    );

    if (!provinceKey) {
      return res.status(400).json({ error: 'Invalid province name' });
    }

    // Extract districts
    const districts = Object.keys(nepalData[provinceKey]).map((district) => ({
      name: district.trim(), // Clean names
    }));
    res.json(districts); // Return the districts as JSON
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).send('Error fetching districts');
  }
};

// Get municipalities for a specific district
const getMunicipalities = async (req, res) => {
  try {
    const districtName = req.params.districtName.trim(); // Normalize input
    const nepalData = await nepalGeoData('english'); // Fetch Nepal geo data in English
    let municipalities = null;

    // Find the district (case-insensitive match)
    for (const [provinceName, districts] of Object.entries(nepalData)) {
      for (const district in districts) {
        if (district.toLowerCase() === districtName.toLowerCase()) {
          municipalities = districts[district];
          break;
        }
      }
      if (municipalities) break;
    }

    if (!municipalities) {
      return res.status(404).json({ error: 'District not found' });
    }

    // Extract and format municipalities
    const municipalityList = [];
    for (const [type, names] of Object.entries(municipalities)) {
      if (Array.isArray(names)) {
        municipalityList.push(...names);
      }
    }

    if (municipalityList.length === 0) {
      return res.status(404).json({ error: 'No municipalities found' });
    }

    res.json(
      municipalityList.map((name, index) => ({
        id: index + 1,
        name: name.trim(), // Clean names
      }))
    );
  } catch (error) {
    console.error('Error fetching municipality data:', error);
    res.status(500).send('Error fetching municipality data');
  }
};

module.exports = {
  getProvinces,
  getDistricts,
  getMunicipalities,
};
