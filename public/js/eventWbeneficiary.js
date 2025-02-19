// Function to populate provinces on page load
function populateProvinces(provinceSelect) {
    fetch("/api/provinces")
        .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch provinces");
        return response.json();
        })
        .then((provinces) => {
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        provinces.forEach((province) => {
            const option = document.createElement("option");
            option.value = province.name; // Ensure this matches the backend's property
            option.textContent = province.name;
            provinceSelect.appendChild(option);
        });
        provinceSelect.disabled = false;
        })
        .catch((error) => {
        console.error("Error loading provinces:", error);
        provinceSelect.innerHTML = '<option value="">Error loading provinces</option>';
        });
}

// Event listener for province change
document.querySelector("#province").addEventListener("change", function (e) {
    const provinceName = e.target.value.trim(); // Get selected province name
    const districtSelect = document.querySelector("#district");
    const municipalitySelect = document.querySelector("#municipality");

    districtSelect.disabled = true;
    municipalitySelect.disabled = true;
    districtSelect.innerHTML = '<option value="">Loading...</option>';
    municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';

    if (!provinceName) {
        districtSelect.innerHTML = '<option value="">Select Province First</option>';
        return;
    }

    // Fetch districts for the selected province
    fetch(`/api/districts/${provinceName}`)
        .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch districts");
        return response.json();
        })
        .then((districts) => {
        districtSelect.innerHTML = '<option value="">Select District</option>';
        districts.forEach((district) => {
            const option = document.createElement("option");
            option.value = district.name; // Ensure this matches the backend's property
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });
        districtSelect.disabled = false;
        })
        .catch((error) => {
        console.error("Error loading districts:", error);
        districtSelect.innerHTML = '<option value="">Error loading districts</option>';
        });
});

// Event listener for district change
document.querySelector("#district").addEventListener("change", function (e) {
    const districtName = e.target.value.trim();
    const municipalitySelect = document.querySelector("#municipality");

    municipalitySelect.disabled = true;
    municipalitySelect.innerHTML = '<option value="">Loading...</option>';

    if (!districtName) {
        municipalitySelect.innerHTML = '<option value="">Select District First</option>';
        return;
    }

    // Fetch municipalities for the selected district
    fetch(`/api/municipalities/${districtName}`)
        .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch municipalities");
        return response.json();
        })
        .then((municipalities) => {
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        municipalities.forEach((municipality) => {
            const option = document.createElement("option");
            option.value = municipality.name; // Ensure this matches the backend's property
            option.textContent = municipality.name;
            municipalitySelect.appendChild(option);
        });
        municipalitySelect.disabled = false;
        })
        .catch((error) => {
        console.error("Error loading municipalities:", error);
        municipalitySelect.innerHTML = '<option value="">Error loading municipalities</option>';
        });
});

// Initialize provinces on page load
document.addEventListener("DOMContentLoaded", () => {
    const provinceSelect = document.querySelector("#province");
    populateProvinces(provinceSelect);
});

// Function to fetch the user's current geolocation
function fetchGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
            },
            (error) => {
                let message = "Unable to fetch location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = "Permission denied for geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        message = "The request to get your location timed out.";
                        break;
                }
                alert(message);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

let beneficiaryCount = 0;

function addBeneficiary() {
    beneficiaryCount++;

    const container = document.getElementById('beneficiariesContainer');
    const div = document.createElement('div');
    div.classList.add('beneficiary');
    div.innerHTML = `
        <h3>Beneficiary ${beneficiaryCount}</h3>
        <label for="name${beneficiaryCount}">Name:</label>
        <input type="text" id="name${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][name]" required>

        <label for="organizationName${beneficiaryCount}">Name of Associated Organization:</label>
        <input type="text" id="organizationName${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][associatedOrganization][name]" required>

        <label for="organizationType${beneficiaryCount}">Type of Organization:</label>
        <select id="organizationType${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][associatedOrganization][main]" required onchange="showTypeSelection(${beneficiaryCount})">
            <option value="Market">Market</option>
            <option value="Community">Community</option>
            <option value="Government">Government</option>
            <option value="CSO">CSOs</option>
        </select>

        <div id="communityTypeContainer${beneficiaryCount}" style="display: none;">
            <label for="subType${beneficiaryCount}">Community Type:</label>
            <select id="subType${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][associatedOrganization][subType]">
                <option value="CFUG">CFUG</option>
                <option value="FG">FG</option>
            </select>
        </div>

        <div id="governmentTypeContainer${beneficiaryCount}" style="display: none;">
            <label for="subType${beneficiaryCount}">Government Type:</label>
            <select id="subType${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][associatedOrganization][subType]">
                <option value="National">National</option>
                <option value="Provincial">Provincial</option>
                <option value="Municipal">Municipal</option>
            </select>
        </div><br>

        <label for="gender${beneficiaryCount}">Gender:</label>
        <select id="gender${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][gender]" required>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
        </select>

        <label for="age${beneficiaryCount}">Age:</label>
        <select id="age${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][age]" required>
            <option value="Upto 25 years">Upto 25 years</option>
            <option value="25-40 years">25-40 years</option>
            <option value="40 above years">40 above years</option>
        </select>

        <label for="casteEthnicity${beneficiaryCount}">Caste/Ethnicity:</label>
        <select id="casteEthnicity${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][casteEthnicity]" required>
            <option value="Dalit">Dalit</option>
            <option value="Janajati">Janajati</option>
            <option value="Brahman/Chhetri">Brahman/Chhetri</option>
            <option value="Tharu">Tharu</option>
            <option value="Madhesi">Madhesi</option>
            <option value="Others">Others</option>
        </select><br>
        <label for="disability${beneficiaryCount}">Disability:</label>
        <input type="checkbox" id="disability${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][disability]">
        <label for="povertyStatus${beneficiaryCount}">Poverty Status:</label>
        <select id="povertyStatus${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][povertyStatus]" required>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
        </select><br>
        <label for="benefitsFromActivity${beneficiaryCount}">Benefits from Activity:</label>
        <input type="checkbox" id="benefitsFromActivity${beneficiaryCount}" name="beneficiaries[${beneficiaryCount}][benefitsFromActivity]"><br>

        <button type="button" onclick="removeBeneficiary(this)">Remove</button>
    `;
    container.appendChild(div);
}

function removeBeneficiary(button) {
    beneficiaryCount--;
    button.parentElement.remove();
}

function showTypeSelection(beneficiaryCount) {
    const mainType = document.getElementById(`organizationType${beneficiaryCount}`).value;
    const communityContainer = document.getElementById(`communityTypeContainer${beneficiaryCount}`);
    const governmentContainer = document.getElementById(`governmentTypeContainer${beneficiaryCount}`);
    const subTypeField = document.getElementById(`subType${beneficiaryCount}`);

    // Reset the subType field
    if (subTypeField) {
        subTypeField.value = '';
    }

    if (mainType === 'Community') {
        communityContainer.style.display = 'block';
        governmentContainer.style.display = 'none';
    } else if (mainType === 'Government') {
        governmentContainer.style.display = 'block';
        communityContainer.style.display = 'none';
    } else {
        communityContainer.style.display = 'none';
        governmentContainer.style.display = 'none';
    }
}


