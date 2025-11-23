import express from "express";
import auth from "../middleware/auth.js";
import Treatment from "../models/Treatment.js";
import Visit from "../models/Visit.js";

const router = express.Router();

router.get("/:id", auth, async (req, res) => {
  try {
    const treatment = await Treatment.findById(req.params.id);

    if (!treatment) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    res.json(treatment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Only doctors can create treatments" });
    }

    const { visitId, name, amount, description, cost } = req.body;

    const visit = await Visit.findOne({ _id: visitId });

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const treatment = await Treatment.create({
      visitId,
      name,
      amount,
      description,
      cost,
    });

    await treatment.populate("visitId", "_id");

    res.status(201).json(treatment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Only doctors can update treatments" });
    }

    const treatment = await Treatment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!treatment) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    res.json(treatment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Only doctors can delete treatments" });
    }

    const treatment = await Treatment.findByIdAndDelete(req.params.id);

    if (!treatment) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    res.json(treatment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/total_cost_for_visit/:id", auth, async (req, res) => {
  try {

    const treatments = await Treatment.find({
      visitId: req.params.id,
    });

    const totalCost = treatments.reduce((total, treatment) => {
      return total + treatment.cost;
    }, 0);

    res.json({ totalCost });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
