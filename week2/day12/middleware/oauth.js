const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const User = require('../models/User');

// Helper to safely get a profile email.
const getProfileEmail = (profile) => {
  return profile?.emails?.[0]?.value?.toLowerCase() || null;
};

// -------------------- Google OAuth2 --------------------
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          '/api/v1/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = getProfileEmail(profile);

          if (!email) {
            return done(new Error('Google account email not available'));
          }

          let existingUser = await User.findOne({
            $or: [
              { googleId: profile.id },
              { email }
            ]
          });

          if (existingUser) {
            if (!existingUser.googleId) {
              existingUser.googleId = profile.id;
              await existingUser.save();
            }

            return done(null, existingUser);
          }

          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName || 'Google User',
            email,
            avatar: profile.photos?.[0]?.value,
            isActive: true,
            role: 'user'
          });

          await newUser.save();

          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// -------------------- Facebook OAuth2 --------------------
if (
  process.env.FACEBOOK_APP_ID &&
  process.env.FACEBOOK_APP_SECRET
) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:
          process.env.FACEBOOK_CALLBACK_URL ||
          '/api/v1/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'picture']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = getProfileEmail(profile);

          if (!email) {
            return done(new Error('Facebook account email not available'));
          }

          let existingUser = await User.findOne({
            $or: [
              { facebookId: profile.id },
              { email }
            ]
          });

          if (existingUser) {
            if (!existingUser.facebookId) {
              existingUser.facebookId = profile.id;
              await existingUser.save();
            }

            return done(null, existingUser);
          }

          const name =
            profile.displayName ||
            `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
            'Facebook User';

          const newUser = new User({
            facebookId: profile.id,
            name,
            email,
            avatar: profile.photos?.[0]?.value,
            isActive: true,
            role: 'user'
          });

          await newUser.save();

          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// -------------------- GitHub OAuth2 --------------------
if (
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET
) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          '/api/v1/auth/github/callback',
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = getProfileEmail(profile);

          if (!email) {
            return done(new Error('GitHub account email not available'));
          }

          let existingUser = await User.findOne({
            $or: [
              { githubId: profile.id },
              { email }
            ]
          });

          if (existingUser) {
            if (!existingUser.githubId) {
              existingUser.githubId = profile.id;
              await existingUser.save();
            }

            return done(null, existingUser);
          }

          const newUser = new User({
            githubId: profile.id,
            name: profile.displayName || profile.username || 'GitHub User',
            email,
            avatar: profile.photos?.[0]?.value,
            isActive: true,
            role: 'user'
          });

          await newUser.save();

          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// -------------------- Session Serialization --------------------
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
