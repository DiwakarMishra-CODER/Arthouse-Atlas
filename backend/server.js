import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { corsOptions, sanitizeInput } from './middleware/security.js';
import { startWatchIndex } from './services/watchIndex.js';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import userRoutes from './routes/userRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import directorRoutes from './routes/directorRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import recsRoutes from './routes/recsRoutes.js';
import aboutRoutes from './routes/aboutRoutes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Auth routes will fail at request time otherwise — set it in the environment before starting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Render puts one proxy in front of the API. Trusting that hop makes req.ip
// the visitor's address, not the proxy's; without it every visitor shared one
// rate-limit allowance (20 sign-in attempts per 15 minutes for the whole site).
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Middleware
// Security headers. The API only sends JSON, so the cross-origin policy is
// relaxed: the site and the API live on different domains.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions()));
// JSON shrinks four- or five-fold on the way out (Explore's counts are the biggest replies)
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discover', discoveryRoutes);
app.use('/api/directors', directorRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/recs', recsRoutes);
app.use('/api/about', aboutRoutes);

// Keep-Alive Ping Route for Render (no DB, no auth, instant response)
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'Server is awake', timestamp: new Date() });
});

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
  // where to watch every film, rebuilt daily in the background (services/watchIndex.js)
  startWatchIndex();
});
