let fieldIndex = 1;
// Add Field
document.getElementById("addField").addEventListener("click", function () {
  const fieldTemplate = `
    <div class="field" data-field-index="${fieldIndex}">
      <label for="fieldName">Field Name</label>
      <input type="text" name="fields[${fieldIndex}][fieldName]" required />

      <label for="fieldType">Field Type</label>
      <select name="fields[${fieldIndex}][fieldType]" required class="fieldType">
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="select">Select (Dropdown)</option>
        <option value="checkbox">Select Many (Checkbox)</option>
        <option value="date">Date</option>
        <option value="time">Time</option>
        <option value="decimal">Decimal</option>
        <option value="boolean">Boolean</option>
        <option value="location">Location (Province/District/Municipality)</option>
        <option value="attendee">Attendee</option>
      </select>

      <label for="required">Required</label>
      <input type="checkbox" name="fields[${fieldIndex}][required]" />

      <!-- Options for select fields -->
      <div class="options-container" style="display: none;">
        <label for="options">Options</label>
        <div id="options-${fieldIndex}"></div>
        <button type="button" class="addOption" data-field-index="${fieldIndex}">Add Option</button>
      </div>

      <!-- Attendee form -->
      <div class="attendee-container" style="display: none;">
        <h4>Attendee Details</h4>
        <div id="attendee-fields-${fieldIndex}">
          <div class="attendee-field" data-attendee-index="0">
            <label for="attendeeFieldName">Attendee Field Name</label>
            <input type="text" name="fields[${fieldIndex}][attendeeFields][0][fieldName]" required />

            <label for="attendeeFieldType">Attendee Field Type</label>
            <select name="fields[${fieldIndex}][attendeeFields][0][fieldType]" required>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <button type="button" class="deleteAttendeeField">Delete Attendee Field</button>
          </div>
        </div>
        <button type="button" class="addAttendeeField" data-field-index="${fieldIndex}">Add Attendee Field</button>
      </div>

      <button type="button" class="deleteField">Delete Field</button>
    </div>
  `;

  const fieldsContainer = document.getElementById("fields");
  fieldsContainer.insertAdjacentHTML("beforeend", fieldTemplate);
  fieldIndex++;
});

// Toggle attendee fields visibility based on selected field type
document.addEventListener("change", function (e) {
  if (e.target.classList.contains("fieldType")) {
    const field = e.target.closest(".field");
    const attendeeContainer = field.querySelector(".attendee-container");
    const optionsContainer = field.querySelector(".options-container");

    if (e.target.value === "attendee") {
      attendeeContainer.style.display = "block";
      optionsContainer.style.display = "none";
    } else if (e.target.value === "select" || e.target.value === "checkbox") {
      attendeeContainer.style.display = "none";
      optionsContainer.style.display = "block";
    } else {
      attendeeContainer.style.display = "none";
      optionsContainer.style.display = "none";
    }
  }
});

// Add Option to select or checkbox field
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("addOption")) {
    const fieldIndex = e.target.dataset.fieldIndex;
    const optionsContainer = document.getElementById(`options-${fieldIndex}`);
    const optionIndex = optionsContainer.querySelectorAll(".option").length;
    const optionTemplate = `
      <div class="option">
        <input type="text" name="fields[${fieldIndex}][options][]" placeholder="Option ${optionIndex + 1}">
        <button type="button" class="deleteOption">Delete Option</button>
      </div>
    `;
    optionsContainer.insertAdjacentHTML("beforeend", optionTemplate);
  }
});

// Delete Option
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("deleteOption")) {
    e.target.closest(".option").remove();
  }
});

// Add Attendee Field
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("addAttendeeField")) {
    const fieldIndex = e.target.dataset.fieldIndex;
    const attendeeFieldsContainer = document.getElementById(`attendee-fields-${fieldIndex}`);
    const attendeeIndex = attendeeFieldsContainer.querySelectorAll(".attendee-field").length;
    const attendeeFieldTemplate = `
      <div class="attendee-field" data-attendee-index="${attendeeIndex}">
        <label for="attendeeFieldName">Attendee Field Name</label>
        <input type="text" name="fields[${fieldIndex}][attendeeFields][${attendeeIndex}][fieldName]" required />

        <label for="attendeeFieldType">Attendee Field Type</label>
        <select name="fields[${fieldIndex}][attendeeFields][${attendeeIndex}][fieldType]" required>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
        <button type="button" class="deleteAttendeeField">Delete Attendee Field</button>
      </div>
    `;
    attendeeFieldsContainer.insertAdjacentHTML("beforeend", attendeeFieldTemplate);
  }
});

// Delete Attendee Field
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("deleteAttendeeField")) {
    e.target.closest(".attendee-field").remove();
  }
});

// Delete main field
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("deleteField")) {
    e.target.closest(".field").remove();
  }
});

