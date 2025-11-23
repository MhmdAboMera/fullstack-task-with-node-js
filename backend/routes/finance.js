
import express from "express";
import auth from "../middleware/auth.js";
import Visit from "../models/Visit.js";
import User from "../models/User.js";

const router = express.Router();

// Finance search with multiple filters
router.get("/search", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { _id, patientName, doctorName, paymentStatus } = req.query;
    let filter = {};

    if (_id) {
      filter._id = { $regex: _id, $options: "i" };
    }

    if (patientName || doctorName) {
      filter.$or = [];

      if (patientName) {
        const patients = await User.find({
          role: "patient",
          name: { $regex: patientName, $options: "i" },
        });
        filter.$or.push({ patient: { $in: patients.map((p) => p._id) } });
      }

      if (doctorName) {
        const doctors = await User.find({
          role: "doctor",
          name: { $regex: doctorName, $options: "i" },
        });
        filter.$or.push({ doctor: { $in: doctors.map((d) => d._id) } });
      }
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Remove empty $or array
    if (filter.$or && filter.$or.length === 0) {
      delete filter.$or;
    }

    const visits = await Visit.find(filter)
      .populate("patient", "name email phone")
      .populate("doctor", "name specialization")
      .sort({ createdAt: -1 });

    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update payment status
router.patch("/:id/payment", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { paymentStatus } = req.body;
    const visit = await Visit.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    )
      .populate("patient", "name email phone")
      .populate("doctor", "name specialization");

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get financial statistics
router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const stats = await Visit.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalStats = await Visit.aggregate([
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    res.json({
      paymentStats: stats,
      overallStats: totalStats[0] || {
        totalVisits: 0,
        totalRevenue: 0,
        paidRevenue: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// module.exports = router;
export default router;
