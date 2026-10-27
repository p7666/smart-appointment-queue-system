const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  durationMinutes: { type: Number, default: 30 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Service', serviceSchema);