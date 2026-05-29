CREATE TABLE IF NOT EXISTS presets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  config        JSON NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(50) NOT NULL UNIQUE,
  preset_id     INT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  store_id      INT,
  receipt_date  DATE,
  scan_date     DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount  DECIMAL(10,2),
  raw_text      TEXT NOT NULL,
  image_path    VARCHAR(255),
  status        ENUM('ok','review') DEFAULT 'review',
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id    INT NOT NULL,
  description   VARCHAR(255),
  quantity      DECIMAL(6,2),
  unit_price    DECIMAL(10,2),
  line_total    DECIMAL(10,2),
  category      VARCHAR(50),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  store_id        INT NOT NULL,
  receipt_id      INT,
  points_earned   INT DEFAULT 0,
  points_balance  INT DEFAULT 0,
  scan_date       DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes           TEXT,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL
);

INSERT IGNORE INTO presets (id, name, config) VALUES
(1, 'Standaard', JSON_OBJECT(
  'store_name_keywords', JSON_ARRAY(),
  'fields', JSON_OBJECT(
    'total_amount', true,
    'items', false,
    'receipt_date', true,
    'loyalty_points', JSON_OBJECT('enabled', false)
  )
)),
(2, 'Slager', JSON_OBJECT(
  'store_name_keywords', JSON_ARRAY('slager', 'vlees', 'butcher'),
  'fields', JSON_OBJECT(
    'total_amount', true,
    'items', true,
    'receipt_date', true,
    'loyalty_points', JSON_OBJECT(
      'enabled', true,
      'regex', 'punten[:\\s]+(\\d+)',
      'balance_regex', 'saldo[:\\s]+(\\d+)'
    )
  )
));
