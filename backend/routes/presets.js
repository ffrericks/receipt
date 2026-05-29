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

/**
 * POST /api/presets/:id/train
 * Leert de preset op basis van een gemarkeerde OCR-regel.
 * Body: { line: "Punten: 45", type: "loyalty_points" | "item" | "store_name" | "total" | "date" }
 */
router.post('/:id/train', auth, async (req, res, next) => {
  try {
    const preset = await Preset.findByPk(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset niet gevonden.' });

    const { line, type } = req.body;
    if (!line || !type) return res.status(400).json({ error: 'line en type zijn verplicht.' });

    const config = JSON.parse(JSON.stringify(preset.config));
    const result = applyTraining(config, line.trim(), type);

    await preset.update({ config });
    res.json({ preset, learned: result });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTraining(config, line, type) {
  switch (type) {
    case 'loyalty_points': {
      // Vind het eerste getal in de regel, bouw regex met alles ervoor als prefix
      const match = line.match(/^(.*?)(\d+)\s*$/);
      if (!match) return { error: 'Geen getal gevonden in deze regel.' };
      const prefix = escapeRegex(match[1].trim());
      const regex = prefix ? `${prefix}[:\\s]*(\\d+)` : `(\\d+)`;
      if (!config.fields) config.fields = {};
      if (!config.fields.loyalty_points) config.fields.loyalty_points = { enabled: true };
      config.fields.loyalty_points.enabled = true;
      config.fields.loyalty_points.regex = regex;
      return { type, regex };
    }

    case 'loyalty_balance': {
      const match = line.match(/^(.*?)(\d+)\s*$/);
      if (!match) return { error: 'Geen getal gevonden in deze regel.' };
      const prefix = escapeRegex(match[1].trim());
      const regex = prefix ? `${prefix}[:\\s]*(\\d+)` : `(\\d+)`;
      if (!config.fields) config.fields = {};
      if (!config.fields.loyalty_points) config.fields.loyalty_points = { enabled: true };
      config.fields.loyalty_points.enabled = true;
      config.fields.loyalty_points.balance_regex = regex;
      return { type, regex };
    }

    case 'store_name': {
      const keyword = line.toLowerCase().trim();
      if (!config.store_name_keywords) config.store_name_keywords = [];
      if (!config.store_name_keywords.includes(keyword)) {
        config.store_name_keywords.push(keyword);
      }
      return { type, keyword };
    }

    case 'item': {
      if (!config.fields) config.fields = {};
      config.fields.items = true;
      // Detecteer prijspatroon aan het einde van de regel
      const priceMatch = line.match(/(\d+[.,]\d{2})\s*$/);
      if (priceMatch && !config.item_line_hint) {
        config.item_line_hint = 'price_at_end';
      }
      return { type, items_enabled: true };
    }

    case 'total': {
      if (!config.fields) config.fields = {};
      config.fields.total_amount = true;
      // Sla het prefix op als hint voor de parser
      const amountMatch = line.match(/^(.*?)(\d+[.,]\d{2})/);
      if (amountMatch) {
        const prefix = escapeRegex(amountMatch[1].trim());
        if (prefix) config.total_keyword_hint = prefix;
      }
      return { type };
    }

    default:
      return { error: `Onbekend type: ${type}` };
  }
}

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const preset = await Preset.findByPk(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset niet gevonden.' });
    if (parseInt(req.params.id) <= 2) {
      return res.status(403).json({ error: 'Standaard presets kunnen niet worden verwijderd.' });
    }
    await preset.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
