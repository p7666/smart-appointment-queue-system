const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: false },
  customerPhone: { type: String, required: true },
  description: { type: String, required: false },
  durationMinutes: { type: Number, required: false },
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