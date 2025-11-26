
import express from 'express';
import auth from '../middleware/auth.js';
import Visit from '../models/Visit.js';
import User from '../models/User.js';

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const {
      name,
      email,
      specialization,
      phone,
      address,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (page - 1) * limit;

    let filter = { role: "doctor" };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (specialization) {
      filter.specialization = { $regex: specialization, $options: "i" };
    }

    if (phone) {
      filter.phone = { $regex: phone, $options: "i" };
    }

    if (address) {
      filter.address = { $regex: address, $options: "i" };
    }

    const total = await User.countDocuments(filter);

    const doctors = await User.find(filter)
      .select("name email phone specialization address createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      doctors,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get doctor's schedule
router.get('/schedule', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { date } = req.query;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const schedule = await Visit.find({
      doctor: req.user.id,
      scheduledDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('patient', 'name phone')
      .sort({ scheduledDate: 1 });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current active visit for doctor
router.get('/current-visit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const currentVisit = await Visit.findOne({
      doctor: req.user.id,
      status: 'in-progress'
    }).populate('patient', 'name phone email address');

    res.json(currentVisit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;