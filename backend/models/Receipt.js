const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Receipt', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  store_id:     { type: DataTypes.INTEGER },
  receipt_date: { type: DataTypes.DATEONLY },
  scan_date:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_amount: { type: DataTypes.DECIMAL(10, 2) },
  raw_text:     { type: DataTypes.TEXT, allowNull: false },
  image_path:   { type: DataTypes.STRING(255) },
  status:       { type: DataTypes.ENUM('ok', 'review'), defaultValue: 'review' }
}, {
  tableName: 'receipts',
  timestamps: false
});
