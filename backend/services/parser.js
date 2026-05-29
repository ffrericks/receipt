const { Preset } = require('../models');

async function parse(rawText, presetId) {
  // Try to auto-detect a better-matching preset by scanning all keywords
  const allPresets = await Preset.findAll();
  let config = null;
  let detectedPresetId = presetId;

  for (const p of allPresets) {
    const keywords = p.config?.store_name_keywords || [];
    const lower = rawText.toLowerCase();
    if (keywords.length > 0 && keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      config = p.config;
      detectedPresetId = p.id;
      break;
    }
  }

  if (!config) {
    const selected = allPresets.find(p => p.id === parseInt(presetId));
    config = selected ? selected.config : getDefaultConfig();
  }

  const result = {
    store_name: null,
    total_amount: null,
    receipt_date: null,
    items: [],
    loyalty_points: null,
    confidence: 'low',
    preset_id: detectedPresetId
  };

  if (config.fields?.total_amount) {
    result.total_amount = extractTotal(rawText);
  }

  if (config.fields?.receipt_date) {
    result.receipt_date = extractDate(rawText);
  }

  result.store_name = extractStoreName(rawText, config.store_name_keywords || []);

  if (config.fields?.items) {
    result.items = extractItems(rawText, config.item_categories);
  }

  const loyaltyConfig = config.fields?.loyalty_points;
  if (loyaltyConfig?.enabled) {
    result.loyalty_points = extractLoyaltyPoints(rawText, loyaltyConfig);
  }

  result.confidence = calcConfidence(result);
  return result;
}

function extractTotal(text) {
  // Look for total keywords on the same or next line, pick the last/largest match
  const totalKeywords = /\b(totaal|te betalen|totaalbedrag|total|sum|af te rekenen|pinbedrag|betaald)\b/i;
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (totalKeywords.test(lines[i])) {
      const search = lines.slice(i, i + 3).join(' ');
      const match = search.match(/(\d{1,3})[.,](\d{2})\b/g);
      if (match) {
        const amounts = match.map(m => parseFloat(m.replace(',', '.')));
        return Math.max(...amounts);
      }
    }
  }

  // Fallback: largest euro amount in entire text
  const allAmounts = [...text.matchAll(/\b(\d{1,3})[.,](\d{2})\b/g)]
    .map(m => parseFloat(m[0].replace(',', '.')))
    .filter(n => n > 0.09);

  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts);
}

function extractDate(text) {
  // dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy
  const patterns = [
    /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/,
    /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})\b/
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const [, d, mo, y] = m;
      const year = y.length === 2 ? `20${y}` : y;
      const date = new Date(`${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
      if (!isNaN(date)) {
        return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function extractStoreName(text, keywords) {
  if (keywords.length > 0) {
    const lower = text.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
  }
  // Fallback: first non-empty line that looks like a store name (not a number/date)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 60 && !/^\d/.test(line)) {
      return line;
    }
  }
  return null;
}

function extractItems(text, itemCategories) {
  const items = [];
  const itemPattern = /^(.+?)\s+(\d+[.,]\d{2})\s*$/;

  for (const line of text.split('\n')) {
    const clean = line.trim();
    const m = clean.match(itemPattern);
    if (!m) continue;

    const description = m[1].trim();
    const price = parseFloat(m[2].replace(',', '.'));
    if (description.length < 2 || price <= 0) continue;

    // Skip total-like lines
    if (/totaal|te betalen|btw|discount/i.test(description)) continue;

    const category = resolveCategory(description, itemCategories);
    items.push({ description, line_total: price, category });
  }
  return items;
}

function resolveCategory(description, itemCategories) {
  if (!itemCategories) return null;
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(itemCategories.keywords || {})) {
    if (lower.includes(keyword.toLowerCase())) return category;
  }
  return itemCategories.default || null;
}

function extractLoyaltyPoints(text, config) {
  const result = {};
  if (config.regex) {
    const m = text.match(new RegExp(config.regex, 'i'));
    if (m) result.earned = parseInt(m[1]);
  }
  if (config.balance_regex) {
    const m = text.match(new RegExp(config.balance_regex, 'i'));
    if (m) result.balance = parseInt(m[1]);
  }
  return Object.keys(result).length > 0 ? result : null;
}

function calcConfidence(result) {
  let score = 0;
  if (result.total_amount) score += 2;
  if (result.receipt_date) score += 2;
  if (result.store_name) score += 1;
  if (result.items.length > 0) score += 1;
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function getDefaultConfig() {
  return {
    store_name_keywords: [],
    fields: { total_amount: true, items: false, receipt_date: true, loyalty_points: { enabled: false } }
  };
}

module.exports = { parse };
