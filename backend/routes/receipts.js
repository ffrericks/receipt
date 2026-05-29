const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { Receipt, ReceiptItem, Store, LoyaltyPoints } = require('../models');

router.post('/scan', auth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Geen afbeelding ontvangen.' });
    const ocr = require('../services/ocr');
    const parser = require('../services/parser');
    const imageProcessor = require('../services/imageProcessor');
    const processedPath = await imageProcessor.process(req.file.path);
    const rawText = await ocr.extract(processedPath);
    const presetId = req.body.preset_id ? parseInt(req.body.preset_id) : 1;
    const parsed = await parser.parse(rawText, presetId);
    res.json({ raw_text: rawText, parsed, image_path: req.file.filename });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { store_name, receipt_date, total_amount, raw_text, image_path, status, items, loyalty_points } = req.body;
    if (!raw_text) return res.status(400).json({ error: 'raw_text is verplicht.' });

    let store_id = req.body.store_id || null;
    if (!store_id && store_name) {
      const slug = store_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const [store] = await Store.findOrCreate({
        where: { slug },
        defaults: { name: store_name, slug }
      });
      store_id = store.id;
    }

    const receipt = await Receipt.create({
      store_id,
      receipt_date: receipt_date || null,
      total_amount: total_amount || null,
      raw_text,
      image_path: image_path || null,
      status: status || 'ok'
    });

    if (items && items.length > 0) {
      await ReceiptItem.bulkCreate(items.map(i => ({ ...i, receipt_id: receipt.id })));
    }

    if (store_id && loyalty_points?.earned != null) {
      // Bereken nieuw saldo op basis van laatste bekende saldo voor deze winkel
      const last = await LoyaltyPoints.findOne({
        where: { store_id },
        order: [['scan_date', 'DESC']]
      });
      const prevBalance = last ? last.points_balance : 0;
      const newBalance = loyalty_points.balance != null
        ? loyalty_points.balance
        : prevBalance + loyalty_points.earned;

      await LoyaltyPoints.create({
        store_id,
        receipt_id: receipt.id,
        points_earned: loyalty_points.earned,
        points_balance: newBalance
      });
    }

    const webhook = require('../services/webhook');
    await webhook.send(receipt.id);
    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { count, rows } = await Receipt.findAndCountAll({
      include: [{ model: Store, attributes: ['id', 'name'] }],
      order: [['scan_date', 'DESC']],
      limit,
      offset
    });
    res.json({ total: count, page, pages: Math.ceil(count / limit), receipts: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [
        { model: Store },
        { model: ReceiptItem, as: 'items' }
      ]
    });
    if (!receipt) return res.status(404).json({ error: 'Bon niet gevonden.' });
    res.json(receipt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
