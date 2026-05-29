const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Preset } = require('../models');

router.get('/', auth, async (req, res, next) => {
  try {
    const presets = await Preset.findAll({ order: [['id', 'ASC']] });
    res.json(presets);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { name, config } = req.body;
    if (!name || !config) return res.status(400).json({ error: 'Naam en config zijn verplicht.' });
    const preset = await Preset.create({ name, config });
    res.status(201).json(preset);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const preset = await Preset.findByPk(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset niet gevonden.' });
    await preset.update(req.body);
    res.json(preset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
