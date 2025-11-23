
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
const router = express.Router();

// Get all doctors for patient to choose from
router.get('/doctors', auth, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const doctors = await User.find({ role: 'doctor' }).select('name specialization email phone');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
export default router;