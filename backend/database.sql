-- Create database
CREATE DATABASE IF NOT EXISTS store_manager;
USE store_manager;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL,
  sell_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'card', 'mobile') NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending', 'confirmed', 'shipped', 'cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price_at_order DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  description TEXT
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description)
VALUES ('low_stock_threshold', '10', 'Seuil d\'alerte pour stock bas');

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MUZWg8TFXxe9i9SkOU3vx5YnNp3IGi', 'admin');

-- Insert some sample products
INSERT INTO products (name, category, buy_price, sell_price, quantity, barcode, description)
VALUES 
('Lait Entier 1L', 'Produits laitiers', 1.20, 1.50, 50, '3000000000001', 'Lait entier de ferme'),
('Baguette Tradition', 'Boulangerie', 1.10, 1.30, 30, '3000000000002', 'Baguette tradition fraîche'),
('Pommes Golden (kg)', 'Fruits et légumes', 2.50, 3.00, 40, '3000000000003', 'Pommes Golden de France'),
('Eau Minérale 6x1.5L', 'Boissons', 3.50, 4.00, 25, '3000000000004', 'Pack de 6 bouteilles d\'eau minérale'),
('Café Moulu 250g', 'Épicerie', 4.20, 4.50, 15, '3000000000005', 'Café arabica moulu');
