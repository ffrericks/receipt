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

  const payload = {
    receipt_id: receipt.id,
    store: receipt.Store?.name || null,
    scan_date: receipt.scan_date,
    total_amount: receipt.total_amount,
    raw_text: receipt.raw_text,
    items: receipt.items?.map(i => ({ description: i.description, price: i.line_total })) || [],
    loyalty_points: receipt.LoyaltyPoint
      ? { earned: receipt.LoyaltyPoint.points_earned, balance: receipt.LoyaltyPoint.points_balance }
      : null
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('n8n webhook mislukt (non-fatal):', err.message);
  }
}

module.exports = { send };
