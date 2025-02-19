const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  events: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event' 
  }] 
});

const Program = mongoose.model('Program', programSchema);

module.exports = Program;
