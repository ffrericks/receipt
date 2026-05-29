const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sequelize, Receipt, Store } = require('../models');
const { fn, col, literal, Op } = require('sequelize');

router.get('/', auth, async (req, res, next) => {
  try {
    const [monthly, byStore] = await Promise.all([
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
        SELECT
          r.store_id,
          s.name AS store_name,
          COUNT(r.id) AS \`count\`,
          SUM(r.total_amount) AS total
        FROM receipts r
        LEFT JOIN stores s ON s.id = r.store_id
        GROUP BY r.store_id, s.name
        ORDER BY total DESC
      `, { type: sequelize.QueryTypes.SELECT })
    ]);

    res.json({
      monthly: monthly.map(m => ({
        month: m.month,
        receipts: parseInt(m.count),
        total: parseFloat(m.total) || 0
      })),
      by_store: byStore.map(s => ({
        store_id: s.store_id,
        store_name: s.store_name,
        count: parseInt(s.count),
        total: parseFloat(s.total) || 0
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
