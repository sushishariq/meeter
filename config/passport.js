const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      // Ensure the email is strictly @kgpian.iitkgp.ac.in
      if (!email.endsWith('@kgpian.iitkgp.ac.in')) {
        return done(null, false, { message: 'Invalid domain. Only @kgpian.iitkgp.ac.in is allowed.' });
      }

      // Check if user already exists
      const user = await User.findOne({ email });

      if (user) {
        // User exists, fully logged in
        return done(null, user);
      } else {
        // User does not exist, but Google Auth was successful
        // We will pass the email through so the session can track they need to complete registration
        return done(null, false, { email: email, message: 'incomplete_profile' });
      }
    } catch (err) {
      return done(err, null);
    }
  }
));
