const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Receipt, Store, ReceiptItem, LoyaltyPoints } = require('../models');
const { buildPayload } = require('../services/webhook');

// API-key authenticatie — aparte sleutel van de user JWT zodat n8n zonder login kan pollen
function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Ongeldige API key.' });
  }
  next();
}

/**
 * GET /api/n8n/receipts
 *
 * Bedoeld voor n8n scheduled polls (elk uur of elke dag).
 * Geeft alle bons terug die na ?since=<ISO-datum> zijn gescand.
 * Zonder since: laatste 24 uur.
 *
 * Query params:
 *   since  ISO-8601 timestamp  (bijv. 2026-05-29T10:00:00Z)
 *   limit  max aantal resultaten  (default 100)
 */
router.get('/receipts', apiKeyAuth, async (req, res, next) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (isNaN(since)) {
      return res.status(400).json({ error: 'Ongeldige since-waarde. Gebruik ISO-8601 formaat.' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const receipts = await Receipt.findAll({
      where: { scan_date: { [Op.gt]: since } },
      include: [
        { model: Store },
        { model: ReceiptItem, as: 'items' },
        { model: LoyaltyPoints }
      ],
      order: [['scan_date', 'ASC']],
      limit
    });

    const payload = receipts.map(r => {
      const lp = r.LoyaltyPoints || r.LoyaltyPoint || null;
      return buildPayload(r, lp);
    });

    res.json({
      since: since.toISOString(),
      count: payload.length,
      receipts: payload
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/n8n/stats
 *
 * Samenvatting: totaaluitgaven per maand + puntensaldi per winkel.
 * Handig voor dagelijkse rapportage in n8n.
 */
router.get('/stats', apiKeyAuth, async (req, res, next) => {
  try {
    const { sequelize } = require('../models');
    const { fn, col, literal } = require('sequelize');

    const [monthly, pointsRaw] = await Promise.all([
      Receipt.findAll({
        attributes: [
          [fn('DATE_FORMAT', col('receipt_date'), '%Y-%m'), 'month'],
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('total_amount')), 'total']
        ],
        where: { receipt_date: { [Op.ne]: null } },
        group: [literal("DATE_FORMAT(receipt_date, '%Y-%m')")],
        order: [[literal("DATE_FORMAT(receipt_date, '%Y-%m')"), 'DESC']],
        limit: 12,
        raw: true
      }),
      sequelize.query(`
        SELECT s.name AS store_name, lp.points_balance
        FROM loyalty_points lp
        JOIN stores s ON s.id = lp.store_id
        WHERE lp.id = (
          SELECT id FROM loyalty_points lp2
          WHERE lp2.store_id = lp.store_id
          ORDER BY scan_date DESC LIMIT 1
        )
      `, { type: sequelize.QueryTypes.SELECT })
    ]);

    res.json({
      monthly: monthly.map(m => ({
        month: m.month,
        receipts: parseInt(m.count),
        total: parseFloat(m.total) || 0
      })),
      loyalty_balances: pointsRaw
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
