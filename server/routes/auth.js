const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Volunteer = require('../models/Volunteer');
const { protect, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(userDocument) {
  const user = userDocument.toJSON ? userDocument.toJSON() : userDocument;
  return user;
}

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'volunteer',
      skills = [],
      location = {},
      availability = true,
      experience = 'Beginner',
      organization = '',
      bio = '',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (!['volunteer', 'coordinator'].includes(role)) {
      return res.status(400).json({ message: 'Role must be volunteer or coordinator.' });
    }

    const existingUser = await Volunteer.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Volunteer.create({
      name,
      email,
      password: passwordHash,
      role,
      skills,
      location: {
        zone: location.zone || '',
        lat: location.lat ?? null,
        lng: location.lng ?? null,
      },
      availability,
      experience,
      organization,
      bio,
    });

    const token = createToken(user._id);

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await Volunteer.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken(user._id);
    const safeUser = user.toJSON();

    return res.json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed.' });
  }
});

router.get('/me', protect, async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
