const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/auth/login — number-only login
router.post('/login', async (req, res) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Employee number is required' });
  }

  try {
    const user = await User.findOne({ number });
    if (!user) {
      return res.status(404).json({ error: 'No account found for that number' });
    }

    const payload = {
      id: user._id,
      name: user.name,
      role: user.role,
      company: user.company,
      branch: user.branch
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);   // أضف هذا السطر
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/v1/auth/me — lets the frontend re-check who's logged in after a page refresh
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;