const express = require('express');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// رمز الدولة -> اسم الشركة في السجلات
const COUNTRY_TO_COMPANY = {
  AE: 'UAE',
  OM: 'OMAN',
  BH: 'BHR',
  SA: 'KSA',
  TZ: 'TNZ',
};

function detectCountry(req) {
  // إذا كان الموقع خلف Cloudflare تصل الدولة جاهزة
  const cf = req.headers['cf-ipcountry'];
  if (cf && cf !== 'XX') return String(cf).toUpperCase();

  const ip = (req.ip || '').replace(/^::ffff:/, '');
  return geoip.lookup(ip)?.country || null;
}

// GET /api/v1/auth/options — الشركات + فروعها + الشركة الافتراضية حسب الـ IP
router.get('/options', async (req, res) => {
  try {
    const rows = await User.aggregate([
      { $match: { company: { $ne: null }, branch: { $ne: null } } },
      { $group: { _id: { company: '$company', branch: '$branch' } } },
      { $sort: { '_id.company': 1, '_id.branch': 1 } },
    ]);

    const map = new Map();
    for (const { _id } of rows) {
      if (!map.has(_id.company)) map.set(_id.company, []);
      map.get(_id.company).push(_id.branch);
    }
    const companies = [...map].map(([name, branches]) => ({ name, branches }));

    const wanted = COUNTRY_TO_COMPANY[detectCountry(req)];
    const defaultCompany =
      companies.find((c) => c.name.toLowerCase() === (wanted || '').toLowerCase())?.name || null;

    res.json({ companies, defaultCompany });
  } catch (err) {
    console.error('Options error:', err);
    res.status(500).json({ error: 'Failed to load options' });
  }
});

// POST /api/v1/auth/login — company + branch + password (password = number)
router.post('/login', async (req, res) => {
  const { company, branch, password } = req.body;
  if (!company || !branch || !password) {
    return res.status(400).json({ error: 'Company, branch and password are required' });
  }

  const number = Number(password);
  if (!Number.isFinite(number)) {
    return res.status(401).json({ error: 'Invalid company, branch or password' });
  }

  try {
    const user = await User.findOne({ company, branch, number });
    if (!user) {
      return res.status(401).json({ error: 'Invalid company, branch or password' });
    }

    const payload = {
      id: user._id,
      name: user.name,
      role: user.role,
      company: user.company,
      branch: user.branch,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/v1/auth/me
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;