const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ReceiptItem', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  receipt_id:  { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(255) },
  quantity:    { type: DataTypes.DECIMAL(6, 2) },
  unit_price:  { type: DataTypes.DECIMAL(10, 2) },
  line_total:  { type: DataTypes.DECIMAL(10, 2) },
  category:    { type: DataTypes.STRING(50) }
}, {
  tableName: 'receipt_items',
  timestamps: false
});
