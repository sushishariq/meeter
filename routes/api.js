const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meet = require('../models/Meet');
const { tryImmediateMatch } = require('../services/matcher');

// Middleware to protect API routes
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  next();
};

router.use(requireAuth);

// --- User Routes ---
router.get('/user/me', (req, res) => {
  // Return fresh user object from DB to get updated credits
  res.json({ user: req.user });
});

router.get('/user/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}).sort({ credits: -1 }).select('nickname gender age credits').limit(50);
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// --- Meet Routes ---
router.post('/meets/request', async (req, res) => {
  const { type, tags } = req.body;
  const user = req.user;

  if (!['solo', 'squad'].includes(type) || !tags || tags.length === 0 || tags.length > 2) {
    return res.status(400).json({ error: 'Invalid meet parameters.' });
  }

  if (user.credits < 1) {
    return res.status(403).json({ error: 'Insufficient credits.' });
  }

  // Prevent multiple pending requests from the same user
  const existingPending = await Meet.findOne({ status: 'pending', participants: user.email });
  if (existingPending) {
    return res.status(400).json({ error: 'You already have a pending meet request.' });
  }

  try {
    // Deduct credit
    user.credits -= 1;
    user.meetsCreated += 1;
    await user.save();

    // Create pending request
    const newRequest = await Meet.create({
      type,
      tags,
      participants: [user.email],
      nicknames: [user.nickname],
      status: 'pending',
      confirmations: {},
      credited: {}
    });

    // Fire the matching engine
    const matched = await tryImmediateMatch(newRequest._id);
    
    if (matched) {
      return res.json({ success: true, status: 'matched', meet: matched });
    } else {
      return res.json({ success: true, status: 'pending', meet: newRequest });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit meet request.' });
  }
});

router.get('/meets', async (req, res) => {
  try {
    const meets = await Meet.find({ participants: req.user.email }).sort({ createdAt: -1 });
    res.json({ meets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your meets.' });
  }
});

router.post('/meets/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { result } = req.body; // 'showed' or 'noshow'
  const user = req.user;

  if (!['showed', 'noshow'].includes(result)) {
    return res.status(400).json({ error: 'Invalid confirmation format.' });
  }

  try {
    const meet = await Meet.findById(id);
    if (!meet || meet.status !== 'matched' || !meet.participants.includes(user.email)) {
      return res.status(404).json({ error: 'Valid meet not found.' });
    }

    // Initialize map if it was somehow skipped, though mongoose defaults usually handle this
    meet.set(`confirmations.${user.email}`, result);
    await meet.save();

    // Check if everyone confirmed attendance
    let allShowed = true;
    for (const email of meet.participants) {
      if (meet.confirmations.get(email) !== 'showed') {
        allShowed = false;
        break;
      }
    }

    // Only grant credits if every participant confirmed they showed up
    if (allShowed) {
      for (const email of meet.participants) {
        if (!meet.credited.get(email)) {
           const u = await User.findOne({ email });
           if (u) {
             u.credits += 1.5;
             u.meetsCompleted += 1;
             await u.save();
           }
           meet.set(`credited.${email}`, true);
        }
      }
      meet.status = 'completed'; // Lock it
      await meet.save();
      return res.json({ success: true, reward: true, message: '+1.5 credits! Everyone showed up.' });
    }

    return res.json({ success: true, message: 'Thanks for confirming!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing confirmation.' });
  }
});

module.exports = router;
