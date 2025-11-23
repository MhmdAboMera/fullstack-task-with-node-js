import mongoose from "mongoose";

const treatmentSchema = new mongoose.Schema({
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: String,
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
});


export default mongoose.model("Treatment", treatmentSchema);