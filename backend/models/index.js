const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'db',
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

const Preset = require('./Preset')(sequelize);
const Store = require('./Store')(sequelize);
const Receipt = require('./Receipt')(sequelize);
const ReceiptItem = require('./ReceiptItem')(sequelize);
const LoyaltyPoints = require('./LoyaltyPoints')(sequelize);

Preset.hasMany(Store, { foreignKey: 'preset_id' });
Store.belongsTo(Preset, { foreignKey: 'preset_id' });

Store.hasMany(Receipt, { foreignKey: 'store_id' });
Receipt.belongsTo(Store, { foreignKey: 'store_id' });

Receipt.hasMany(ReceiptItem, { foreignKey: 'receipt_id', as: 'items' });
ReceiptItem.belongsTo(Receipt, { foreignKey: 'receipt_id' });

Store.hasMany(LoyaltyPoints, { foreignKey: 'store_id' });
Receipt.hasOne(LoyaltyPoints, { foreignKey: 'receipt_id' });

module.exports = { sequelize, Preset, Store, Receipt, ReceiptItem, LoyaltyPoints };
