const mongoose = require('mongoose');

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^\+?\d+$/;

const appointmentSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  customerName: { type: String, required: true },
  customerEmail: {
    type: String,
    required: false,
    validate: {
      validator: value => value === undefined || value === null || value === '' || EMAIL_REGEX.test(value),
      message: 'Email address is invalid.'
    }
  },
  customerPhone: {
    type: String,
    required: true,
    match: [PHONE_REGEX, 'Phone number must contain only digits with an optional leading +.']
  },
  description: { type: String, required: false },
  durationMinutes: {
    type: Number,
    required: false,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Duration must be a positive whole number of minutes.'
    }
  },
  date: { type: String, required: true }, // YYYY-MM-DD
  slot: { type: String, required: true }, // HH:MM
  status: { type: String, enum: ['Confirmed', 'Cancelled', 'Completed'], default: 'Confirmed' }
}, { timestamps: true });

// CRITICAL: Prevent double booking at the database level.
// Only allows one Confirmed/Completed appointment per date and slot.
appointmentSchema.index(
  { date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Confirmed', 'Completed'] } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);