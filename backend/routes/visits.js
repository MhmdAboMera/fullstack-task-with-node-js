
import express from 'express';
import auth from '../middleware/auth.js';
import Visit from '../models/Visit.js';

const router = express.Router();

// Get all visits (with filters based on user role)
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    
    if (req.user.role === 'patient') {
      filter.patient = req.user.id;
    } else if (req.user.role === 'doctor') {
      filter.doctor = req.user.id;
    }

    const visits = await Visit.find(filter)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization')
      .sort({ scheduledDate: -1 });

    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new visit (patient only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can create visits' });
    }

    const { doctorId, scheduledDate, symptoms } = req.body;

    // Check if doctor is available at that time
    const conflictingVisit = await Visit.findOne({
      doctor: doctorId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (conflictingVisit) {
      return res.status(400).json({ message: 'Doctor is not available at this time' });
    }

    const visit = await Visit.create({
      patient: req.user.id,
      doctor: doctorId,
      scheduledDate,
      symptoms
    });

    await visit.populate('doctor', 'name specialization');

    res.status(201).json(visit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update visit (doctor only - add treatments, diagnosis, etc.)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can update visits' });
    }

    const visit = await Visit.findOne({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['symptoms', 'diagnosis', 'notes', 'treatments', 'status'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        visit[field] = req.body[field];
      }
    });

    await visit.save();
    await visit.populate('patient', 'name email phone');

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single visit
router.get('/:id', auth, async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('patient', 'name email phone address')
      .populate('doctor', 'name specialization');

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Check if user has access to this visit
    if (req.user.role === 'patient' && visit.patient._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'doctor' && visit.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;