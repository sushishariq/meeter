require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meeter-db';

app.use(cors());
app.use(express.json());
const session = require('express-session');
const MongoStore = require('connect-mongo');
// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

require('./config/passport'); // Initialize passport strategy

app.use(session({
  secret: process.env.SESSION_SECRET || 'a_secret_fallback_do_not_use_in_prod',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const path = require('path');

// Serve the Frontend UI
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'meeter.html')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));

// Basic Route for Verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Meeter API is running' });
});

// Periodic Matchmaking Cron Job (Runs every 10 minutes)
const cron = require('node-cron');
const { processStaleRequests } = require('./services/matcher');
cron.schedule('*/10 * * * *', () => {
   console.log('⏳ Running Background Match Matcher...');
   processStaleRequests().catch(console.error);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
