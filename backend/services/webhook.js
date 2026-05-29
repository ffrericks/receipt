const { Receipt, Store, ReceiptItem, LoyaltyPoints } = require('../models');

async function send(receiptId) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  const receipt = await Receipt.findByPk(receiptId, {
    include: [
      { model: Store },
      { model: ReceiptItem, as: 'items' },
      { model: LoyaltyPoints }
    ]
  });
  if (!receipt) return;

  // Sequelize geeft de hasOne associatie terug als 'LoyaltyPoints' (enkelvoud model naam)
  const lp = receipt.LoyaltyPoints || receipt.LoyaltyPoint || null;

  const payload = buildPayload(receipt, lp);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.warn(`n8n webhook antwoordde met ${res.status}`);
    }
  } catch (err) {
    console.warn('n8n push webhook mislukt (non-fatal):', err.message);
  }
}

function buildPayload(receipt, lp) {
  return {
    event: 'receipt.created',
    receipt_id: receipt.id,
    store: receipt.Store?.name || null,
    store_id: receipt.store_id,
    receipt_date: receipt.receipt_date,
    scan_date: receipt.scan_date,
    total_amount: receipt.total_amount ? parseFloat(receipt.total_amount) : null,
    status: receipt.status,
    items: (receipt.items || []).map(i => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price ? parseFloat(i.unit_price) : null,
      line_total: i.line_total ? parseFloat(i.line_total) : null,
      category: i.category
    })),
    loyalty_points: lp ? {
      earned: lp.points_earned,
      balance: lp.points_balance
    } : null
  };
}

module.exports = { send, buildPayload };
