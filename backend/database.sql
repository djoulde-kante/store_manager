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
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User performance metrics table
CREATE TABLE IF NOT EXISTS user_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sales_count INT NOT NULL DEFAULT 0,
  sales_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  avg_sale_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  products_added INT NOT NULL DEFAULT 0,
  orders_processed INT NOT NULL DEFAULT 0,
  period_type ENUM('daily', 'weekly', 'monthly', 'yearly', 'all_time') NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY user_period_idx (user_id, period_type, period_start, period_end)
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'card', 'mobile') NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
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
VALUES ("low_stock_threshold", "10", "Seuil d\'alerte pour stock bas");

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (username, password_hash, role, first_name, last_name, email)
VALUES ("admin", "$2b$10$f56ycqJZAnvsMxOueS9xGOe.o8BOvETzFsSbA7kWWbSCL1X0XVqgS", "admin", "Admin", "System", "admin@storemanager.com");

-- Stored procedure to update user performance metrics
DELIMITER //

-- Drop the procedure if it exists
DROP PROCEDURE IF EXISTS update_user_performance //

CREATE PROCEDURE update_user_performance(IN user_id INT, IN period_type VARCHAR(10))
BEGIN
  DECLARE p_start DATE;
  DECLARE p_end DATE;
  DECLARE sales_count INT;
  DECLARE sales_total DECIMAL(10, 2);
  DECLARE avg_sale DECIMAL(10, 2);
  DECLARE products_added INT;
  DECLARE orders_processed INT;
  
  -- Set period dates based on period_type
  IF period_type = 'daily' THEN
    SET p_start = CURRENT_DATE();
    SET p_end = CURRENT_DATE();
  ELSEIF period_type = 'weekly' THEN
    SET p_start = DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY);
    SET p_end = DATE_ADD(p_start, INTERVAL 6 DAY);
  ELSEIF period_type = 'monthly' THEN
    SET p_start = DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01');
    SET p_end = LAST_DAY(CURRENT_DATE());
  ELSEIF period_type = 'yearly' THEN
    SET p_start = DATE_FORMAT(CURRENT_DATE(), '%Y-01-01');
    SET p_end = DATE_FORMAT(CURRENT_DATE(), '%Y-12-31');
  ELSE -- all_time
    SET p_start = '2000-01-01';
    SET p_end = '2099-12-31';
  END IF;
  
  -- Calculate sales metrics
  SELECT 
    COUNT(*),
    IFNULL(SUM(total), 0),
    IFNULL(AVG(total), 0)
  INTO
    sales_count,
    sales_total,
    avg_sale
  FROM 
    sales
  WHERE 
    user_id = user_id 
    AND DATE(timestamp) BETWEEN p_start AND p_end;
  
  -- Calculate products added (based on stock adjustments or additions)
  SELECT 
    IFNULL(SUM(CASE WHEN action_type = 'PRODUCT_ADD' THEN 1 ELSE 0 END), 0)
  INTO
    products_added
  FROM 
    user_activity_log
  WHERE 
    user_id = user_id 
    AND DATE(created_at) BETWEEN p_start AND p_end;
  
  -- Calculate orders processed
  SELECT 
    COUNT(*)
  INTO
    orders_processed
  FROM 
    orders
  WHERE 
    user_id = user_id 
    AND status IN ('confirmed', 'shipped')
    AND DATE(created_at) BETWEEN p_start AND p_end;
  
  -- Insert or update the performance record
  INSERT INTO user_performance (
    user_id,
    sales_count,
    sales_total,
    avg_sale_value,
    products_added,
    orders_processed,
    period_type,
    period_start,
    period_end
  ) VALUES (
    user_id,
    sales_count,
    sales_total,
    avg_sale,
    products_added,
    orders_processed,
    period_type,
    p_start,
    p_end
  )
  ON DUPLICATE KEY UPDATE
    sales_count = VALUES(sales_count),
    sales_total = VALUES(sales_total),
    avg_sale_value = VALUES(avg_sale_value),
    products_added = VALUES(products_added),
    orders_processed = VALUES(orders_processed),
    updated_at = CURRENT_TIMESTAMP;
END //

-- Event to update user performance metrics daily
-- Drop the event if it exists
DROP EVENT IF EXISTS daily_update_user_performance //

CREATE EVENT daily_update_user_performance
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 23 HOUR
DO
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE curr_user_id INT;
  DECLARE user_cursor CURSOR FOR SELECT id FROM users WHERE status = 'active';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN user_cursor;
  
  read_loop: LOOP
    FETCH user_cursor INTO curr_user_id;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Update metrics for each period type
    CALL update_user_performance(curr_user_id, 'daily');
    CALL update_user_performance(curr_user_id, 'weekly');
    CALL update_user_performance(curr_user_id, 'monthly');
    CALL update_user_performance(curr_user_id, 'yearly');
    CALL update_user_performance(curr_user_id, 'all_time');
  END LOOP;
  
  CLOSE user_cursor;
END //

DELIMITER ;

