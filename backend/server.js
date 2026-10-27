require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const Service = require('./models/Service');
const Appointment = require('./models/Appointment');

const app = express();
app.use(cors());
app.use(express.json());

const STAFF_TOKEN_TTL_SECONDS = 8 * 60 * 60;
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const getCurrentDateTimeIST = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((values, part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
    return values;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  };
};

const safeStringEqual = (left, right) => {
  const leftBuffer = Buffer.from(typeof left === 'string' ? left : '');
  const rightBuffer = Buffer.from(typeof right === 'string' ? right : '');
  return leftBuffer.length === rightBuffer.length &&
    leftBuffer.length > 0 &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getStaffAuthConfig = () => {
  const { STAFF_EMAIL, STAFF_PASSWORD, STAFF_TOKEN_SECRET } = process.env;
  if (!STAFF_EMAIL || !STAFF_PASSWORD || !STAFF_TOKEN_SECRET || STAFF_TOKEN_SECRET.length < 32) {
    return null;
  }
  return { email: STAFF_EMAIL, password: STAFF_PASSWORD, secret: STAFF_TOKEN_SECRET };
};

const createStaffToken = (secret) => {
  const payload = Buffer.from(JSON.stringify({
    sub: 'staff',
    exp: Math.floor(Date.now() / 1000) + STAFF_TOKEN_TTL_SECONDS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const requireStaffAuth = (req, res, next) => {
  const authConfig = getStaffAuthConfig();
  if (!authConfig) {
    return res.status(503).json({ error: 'Staff authentication is not configured.' });
  }

  const authorization = req.get('Authorization') || '';
  const [scheme, token, ...authorizationParts] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || authorizationParts.length > 0) {
    return res.status(401).json({ error: 'Staff authentication required.' });
  }

  const [payload, signature, ...tokenParts] = token.split('.');
  if (!payload || !signature || tokenParts.length > 0) {
    return res.status(401).json({ error: 'Invalid or expired staff token.' });
  }

  const expectedSignature = crypto.createHmac('sha256', authConfig.secret).update(payload).digest('base64url');
  if (!safeStringEqual(signature, expectedSignature)) {
    return res.status(401).json({ error: 'Invalid or expired staff token.' });
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (claims.sub !== 'staff' || !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Invalid or expired staff token.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired staff token.' });
  }

  next();
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB Connection Error:', err));

// --- SEED SCRIPT (Runs once to populate services) ---
const seedServices = async () => {
  const count = await Service.countDocuments();
  if (count === 0) {
    await Service.insertMany([
      { name: 'General Consultation', description: '30 min general checkup', durationMinutes: 30 },
      { name: 'Technical Support', description: '1 hour deep dive', durationMinutes: 60 }
    ]);
  }
};
seedServices();

// --- ROUTES ---

// Staff login
app.post('/api/auth/login', (req, res) => {
  const authConfig = getStaffAuthConfig();
  if (!authConfig) {
    return res.status(503).json({ error: 'Staff authentication is not configured.' });
  }

  const { email, password } = req.body || {};
  if (!safeStringEqual(email, authConfig.email) || !safeStringEqual(password, authConfig.password)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  res.json({
    token: createStaffToken(authConfig.secret),
    expiresIn: STAFF_TOKEN_TTL_SECONDS
  });
});

// 1. Get available services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching services.' });
  }
});

// 2. Get available slots for a date
app.get('/api/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required.' });

  try {
    // Find booked slots for this date that are NOT cancelled
    const bookedAppointments = await Appointment.find({
      date,
      status: { $in: ['Confirmed', 'Completed'] }
    }).select('slot -_id');

    const bookedSlots = bookedAppointments.map(a => a.slot);
    const nowIST = getCurrentDateTimeIST();
    const availableSlots = TIME_SLOTS.filter(slot =>
      !bookedSlots.includes(slot) &&
      (date > nowIST.date || (date === nowIST.date && slot > nowIST.time))
    );

    res.json({ allSlots: TIME_SLOTS, availableSlots, bookedSlots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slots.' });
  }
});

// 3. Create an appointment (Updated with separated email/phone and optional fields)
app.post('/api/appointments', async (req, res) => {
  try {
    const { serviceId, customerName, customerEmail, customerPhone, date, slot, description, durationMinutes } = req.body;

    if (!serviceId || !customerName || !customerPhone || !date || !slot) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    const nowIST = getCurrentDateTimeIST();
    if (date < nowIST.date || (date === nowIST.date && slot <= nowIST.time)) {
      return res.status(400).json({ error: 'Appointments must be booked for a future date and time in IST.' });
    }

    const appointment = new Appointment({ 
      serviceId, customerName, customerEmail, customerPhone, date, slot, description, durationMinutes 
    });
    
    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    // 11000 is MongoDB's Duplicate Key Error for the compound index (concurrency protection)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slot just taken. Please choose another.' });
    }
    res.status(500).json({ error: 'Booking failed.' });
  }
});

// Customer lookup returns only appointments matching the supplied contact.
app.get('/api/appointments/lookup', async (req, res) => {
  const contact = typeof req.query.contact === 'string' ? req.query.contact.trim() : '';
  if (!contact) return res.status(400).json({ error: 'Contact is required.' });

  try {
    const appointments = await Appointment.find({
      $or: [
        { customerEmail: { $regex: `^${escapeRegex(contact)}$`, $options: 'i' } },
        { customerPhone: contact }
      ]
    }).populate('serviceId').sort({ date: 1, slot: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to look up appointments.' });
  }
});

// Customer cancellation verifies the contact used for the lookup.
app.patch('/api/appointments/:id/cancel', async (req, res) => {
  const contact = typeof req.body?.contact === 'string' ? req.body.contact.trim() : '';
  if (!contact) return res.status(400).json({ error: 'Contact is required.' });

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Not found.' });

    const matchesEmail = appointment.customerEmail &&
      appointment.customerEmail.toLowerCase() === contact.toLowerCase();
    const matchesPhone = appointment.customerPhone === contact;
    if (!matchesEmail && !matchesPhone) {
      return res.status(404).json({ error: 'Not found.' });
    }
    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({ error: 'Only confirmed appointments can be cancelled.' });
    }

    appointment.status = 'Cancelled';
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Staff schedule access
app.get('/api/appointments', requireStaffAuth, async (req, res) => {
  const { date, status } = req.query;
  let query = {};
  if (date) query.date = date;
  if (status) query.status = status;

  try {
    const appointments = await Appointment.find(query).populate('serviceId').sort('slot');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Staff-only status management. Confirmed is the only mutable state.
app.patch('/api/appointments/:id/status', requireStaffAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!['Cancelled', 'Completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Not found.' });

    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({ error: `Cannot change an appointment with status ${appointment.status}.` });
    }

    appointment.status = status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));