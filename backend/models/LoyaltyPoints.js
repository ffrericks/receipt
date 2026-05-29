const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('LoyaltyPoints', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  store_id:       { type: DataTypes.INTEGER, allowNull: false },
  receipt_id:     { type: DataTypes.INTEGER },
  points_earned:  { type: DataTypes.INTEGER, defaultValue: 0 },
  points_balance: { type: DataTypes.INTEGER, defaultValue: 0 },
  scan_date:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  notes:          { type: DataTypes.TEXT }
}, {
  tableName: 'loyalty_points',
  timestamps: false
});
