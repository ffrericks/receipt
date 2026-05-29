const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Store, Receipt, LoyaltyPoints, Preset } = require('../models');

router.get('/', auth, async (req, res, next) => {
  try {
    const stores = await Store.findAll({ include: [{ model: Preset, attributes: ['id', 'name'] }] });
    res.json(stores);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/receipts', auth, async (req, res, next) => {
  try {
    const receipts = await Receipt.findAll({
      where: { store_id: req.params.id },
      order: [['scan_date', 'DESC']]
    });
    res.json(receipts);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/points', auth, async (req, res, next) => {
  try {
    const points = await LoyaltyPoints.findAll({
      where: { store_id: req.params.id },
      order: [['scan_date', 'DESC']]
    });
    res.json(points);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
