const express = require('express');
const Request = require('../models/Request');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/v1/admin/overview — عدّادات بسيطة على مستوى النظام
router.get('/overview', async (req, res) => {
  try {
    const [total, pendingReview, approved, pendingExecution, completed, rejected] = await Promise.all([
      Request.countDocuments({}),
      Request.countDocuments({ status: 'Under Review' }),
      Request.countDocuments({ status: { $in: ['Approved', 'Approved with Modification'] } }),
      Request.countDocuments({ stage: 'Pending Execution' }),
      Request.countDocuments({ stage: 'Completed' }),
      Request.countDocuments({ status: 'Rejected' })
    ]);

    res.json({ total, pendingReview, approved, pendingExecution, completed, rejected });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

module.exports = router;