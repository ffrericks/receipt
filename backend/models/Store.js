const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Store', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:       { type: DataTypes.STRING(100), allowNull: false },
  slug:       { type: DataTypes.STRING(50), allowNull: false, unique: true },
  preset_id:  { type: DataTypes.INTEGER },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'stores',
  timestamps: false
});
