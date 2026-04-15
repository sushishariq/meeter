const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// 1. Initiate Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google OAuth Callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return res.redirect('/?error=auth_failed');
    }
    
    if (!user) {
      // Handles domain mismatch OR new user needing to complete profile
      if (info && info.message === 'incomplete_profile') {
        // Store their verified Google email temporarily in session
        req.session.pendingEmail = info.email;
        return res.redirect('/?signup=true');
      }
      return res.redirect('/?error=domain_invalid');
    }

    // User exists, log them into the session
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/'); // Successful login
    });
  })(req, res, next);
});

// 3. Complete Profile (For New Users)
router.post('/complete-profile', async (req, res) => {
  if (!req.session.pendingEmail) {
    return res.status(401).json({ error: 'No pending Google authentication found.' });
  }

  const { nickname, gender, age } = req.body;

  try {
    const newUser = await User.create({
      email: req.session.pendingEmail,
      nickname,
      gender,
      age: parseInt(age, 10)
    });

    // Clear pending state and log them in completely
    delete req.session.pendingEmail;
    
    req.logIn(newUser, (err) => {
      if (err) return res.status(500).json({ error: 'Error binding session' });
      return res.json({ success: true, user: newUser });
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create user. Ensure all fields are valid.' });
  }
});

// 4. Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    req.session.destroy();
    res.json({ success: true });
  });
});

// 5. Get Current User (Used by frontend to check if logged in)
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authed: true, user: req.user });
  } else {
    res.json({ authed: false });
  }
});

module.exports = router;
