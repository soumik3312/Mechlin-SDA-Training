const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },

    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
      required: function passwordRequired() {
        return !this.googleId && !this.facebookId && !this.githubId;
      }
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true
    },

    facebookId: {
      type: String,
      unique: true,
      sparse: true
    },

    githubId: {
      type: String,
      unique: true,
      sparse: true
    },

    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user'
    },

    avatar: {
      type: String,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: {
      type: Date,
      default: null
    },

    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },

      notifications: {
        email: {
          type: Boolean,
          default: true
        },

        push: {
          type: Boolean,
          default: true
        }
      }
    },

    profile: {
      bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
      },

      location: {
        type: String,
        maxlength: [100, 'Location cannot exceed 100 characters']
      },

      website: {
        type: String,
        match: [
          /^https?:\/\/.+/,
          'Please enter a valid URL'
        ]
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual('fullName').get(function getFullName() {
  return this.name;
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  // Do not hash an already-hashed password.
  if (
    this.password.startsWith('$2a$') ||
    this.password.startsWith('$2b$') ||
    this.password.startsWith('$2y$')
  ) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});
userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function generateAuthToken() {
  return jwt.sign(
    {
      userId: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET || 'day12-development-secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    }
  );
};

userSchema.statics.findByCredentials = async function findByCredentials(
  email,
  password
) {
  const user = await this.findOne({
    email: email.toLowerCase().trim(),
    isActive: true
  }).select('+password');

  if (!user || !user.password) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};

module.exports = mongoose.model('Day12User', userSchema);