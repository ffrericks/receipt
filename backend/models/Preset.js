const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Preset', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:       { type: DataTypes.STRING(100), allowNull: false },
  config:     { type: DataTypes.JSON, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'presets',
  timestamps: false
});
