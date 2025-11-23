
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import doctorRoutes from './routes/doctors.js';
import visitRoutes from './routes/visits.js';
import financeRoutes from './routes/finance.js';
import treatmentRoutes from './routes/treatment.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/treatments', treatmentRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI||"mongodb://127.0.0.1:27017/abo_mera" || 'mongodb+srv://mhmd:mhmd123@healthcare-db.kkdmznx.mongodb.net/healthcare', {
  useNewUrlParser: true, 
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});