import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import userRoutes from './routes/userRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import directorRoutes from './routes/directorRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import studioRoutes from './routes/studioRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discover', discoveryRoutes);
app.use('/api/directors', directorRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/studios', studioRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Arthouse Atlas API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
