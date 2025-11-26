import express from "express";
import auth from "../middleware/auth.js";
import Visit from "../models/Visit.js";
import User from "../models/User.js";

const router = express.Router();

// Finance search with multiple filters - FIXED VERSION
router.get("/search", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { patientName, doctorName, paymentStatus, visitId } = req.query;

    console.log("Search params:", { patientName, doctorName, paymentStatus, visitId });

    const filter = {};

    // Search by Visit ID (exact match)
    if (visitId) {
      filter._id = visitId;
    }

    // Search by patient name - check multiple possible fields
    if (patientName) {
      const patients = await User.find({
        role: "patient",
        $or: [
          { username: { $regex: patientName, $options: "i" } },
          { name: { $regex: patientName, $options: "i" } },
          { firstName: { $regex: patientName, $options: "i" } },
          { lastName: { $regex: patientName, $options: "i" } },
          { email: { $regex: patientName, $options: "i" } }
        ]
      }).select("_id");

      console.log("Patients found:", patients.length);

      if (patients.length > 0) {
        filter.patient = { $in: patients.map((p) => p._id) };
      } else {
        // If no patients found, return empty result
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    // Search by doctor name - check multiple possible fields
    if (doctorName) {
      const doctors = await User.find({
        role: "doctor",
        $or: [
          { username: { $regex: doctorName, $options: "i" } },
          { name: { $regex: doctorName, $options: "i" } },
          { firstName: { $regex: doctorName, $options: "i" } },
          { lastName: { $regex: doctorName, $options: "i" } },
          { specialization: { $regex: doctorName, $options: "i" } },
          { email: { $regex: doctorName, $options: "i" } }
        ]
      }).select("_id");

      console.log("Doctors found:", doctors.length);

      if (doctors.length > 0) {
        filter.doctor = { $in: doctors.map((d) => d._id) };
      } else {
        // If no doctors found, return empty result
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    // Filter by payment status (case-insensitive)
    if (paymentStatus) {
      filter.paymentStatus = { $regex: new RegExp(`^${paymentStatus}$`, 'i') };
    }

    console.log("Final filter:", JSON.stringify(filter, null, 2));

    const visits = await Visit.find(filter)
      .populate("patient", "username name firstName lastName email phone")
      .populate("doctor", "username name firstName lastName specialization email")
      .sort({ createdAt: -1 });

    console.log("Visits found:", visits.length);

    res.json({
      success: true,
      data: visits,
    });

  } catch (error) {
    console.error("Finance search error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

// Get all visits (no filters) - for dashboard
router.get("/visits", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const visits = await Visit.find()
      .populate("patient", "username name firstName lastName email phone")
      .populate("doctor", "username name firstName lastName specialization email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: visits,
    });

  } catch (error) {
    console.error(error);
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
    
    if (!["paid", "unpaid", "pending"].includes(paymentStatus.toLowerCase())) {
      return res.status(400).json({ 
        message: "Invalid payment status. Must be: paid, unpaid, or pending" 
      });
    }

    const visit = await Visit.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: paymentStatus.toLowerCase() },
      { new: true }
    )
      .populate("patient", "username name firstName lastName email phone")
      .populate("doctor", "username name firstName lastName specialization email");

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json({
      success: true,
      data: visit,
    });
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

    // Payment status breakdown
    const paymentStats = await Visit.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Overall statistics
    const overallStats = await Visit.aggregate([
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
          pendingRevenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$totalAmount", 0],
            },
          },
          unpaidRevenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    // Recent visits (last 10)
    const recentVisits = await Visit.find()
      .populate("patient", "username name firstName lastName email")
      .populate("doctor", "username name firstName lastName specialization")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      paymentStats: paymentStats,
      overallStats: overallStats[0] || {
        totalVisits: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        unpaidRevenue: 0,
      },
      recentVisits: recentVisits,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get visit details by ID
router.get("/visit/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "finance") {
      return res.status(403).json({ message: "Access denied" });
    }

    const visit = await Visit.findById(req.params.id)
      .populate("patient", "username name firstName lastName email phone")
      .populate("doctor", "username name firstName lastName specialization email");

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json({
      success: true,
      data: visit,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;