const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Store, Receipt, LoyaltyPoints, Preset } = require('../models');

router.get('/', auth, async (req, res, next) => {
  try {
    const stores = await Store.findAll({ include: [{ model: Preset, attributes: ['id', 'name'] }] });

    // Voeg huidig puntensaldo toe per winkel (laatste record per store)
    const storesWithPoints = await Promise.all(stores.map(async s => {
      const last = await LoyaltyPoints.findOne({
        where: { store_id: s.id },
        order: [['scan_date', 'DESC']]
      });
      return { ...s.toJSON(), points_balance: last ? last.points_balance : null };
    }));

    res.json(storesWithPoints);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const store = await Store.findByPk(req.params.id, {
      include: [{ model: Preset, attributes: ['id', 'name'] }]
    });
    if (!store) return res.status(404).json({ error: 'Winkel niet gevonden.' });
    res.json(store);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ error: 'Winkel niet gevonden.' });
    const { name, preset_id } = req.body;
    if (name) store.name = name;
    if (preset_id !== undefined) store.preset_id = preset_id || null;
    await store.save();
    res.json(store);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', auth, async (req, res, next) => {
  try {
    const { Receipt: R, sequelize } = require('../models');
    const { fn, col, literal } = require('sequelize');
    const row = await R.findOne({
      where: { store_id: req.params.id },
      attributes: [
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total_amount')), 'total'],
        [fn('MAX', col('scan_date')), 'last_scan']
      ],
      raw: true
    });
    res.json({
      count: parseInt(row.count) || 0,
      total: parseFloat(row.total) || 0,
      last_scan: row.last_scan || null
    });
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
