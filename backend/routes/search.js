const express = require('express');
const Request = require('../models/Request');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('admin', 'price_editor', 'approver'));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toList = (v) => {
  if (v === undefined || v === null) return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((x) => x.trim()).filter(Boolean);
};

const toNumber = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDate = (v, endOfDay = false) => {
  if (!v) return null;
  const d = new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// GET /api/v1/search/options — القيم الموجودة فعلياً لتعبئة قوائم الفرع والشركة
router.get('/options', async (req, res) => {
  try {
    const [branches, companies] = await Promise.all([
      Request.distinct('branch'),
      Request.distinct('company')
    ]);
    const sortAr = (a, b) => String(a).localeCompare(String(b));
    res.json({ branches: branches.sort(sortAr), companies: companies.sort(sortAr) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch search options' });
  }
});

// GET /api/v1/search/requests — كل الفلاتر اختيارية، وبدونها تُرجع كل الطلبات
router.get('/requests', async (req, res) => {
  try {
    const filter = {};

    const branches = toList(req.query.branches);
    if (branches.length) filter.branch = { $in: branches };

    const companies = toList(req.query.companies);
    if (companies.length) filter.company = { $in: companies };

    const material = String(req.query.material ?? '').trim();
    if (material) filter.material = { $regex: escapeRegex(material), $options: 'i' };

    const min = toNumber(req.query.approved_min);
    const max = toNumber(req.query.approved_max);
    if (min !== null || max !== null) {
      filter.approved_price = {};
      if (min !== null) filter.approved_price.$gte = min;
      if (max !== null) filter.approved_price.$lte = max;
    }

    const from = toDate(req.query.date_from);
    const to = toDate(req.query.date_to, true);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const [items, total] = await Promise.all([
      Request.find(filter)
        .populate('requester', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Request.countDocuments(filter)
    ]);

    res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search requests' });
  }
});

module.exports = router;