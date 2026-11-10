CREATE DATABASE IF NOT EXISTS nexstage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexstage;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organizer_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(40) NOT NULL,
  audience_groups JSON NULL,
  benefits JSON NULL,
  venue VARCHAR(180) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Bangkok',
  description TEXT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  poster_path VARCHAR(255) NOT NULL DEFAULT '/posters/default.svg',
  status ENUM('draft','published','cancelled') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_user FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_event_time CHECK (end_at > start_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  label VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  capacity INT UNSIGNED NOT NULL,
  available INT UNSIGNED NOT NULL,
  CONSTRAINT fk_ticket_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ticket_price CHECK (price >= 0),
  CONSTRAINT chk_ticket_inventory CHECK (available <= capacity),
  UNIQUE KEY uq_ticket_event_label (event_id, label)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  booking_code VARCHAR(50) NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  sync_status ENUM('pending','done','error') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_booking_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id INT UNSIGNED NOT NULL,
  ticket_type_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_item_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_ticket FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  CONSTRAINT chk_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_item_price CHECK (unit_price >= 0),
  UNIQUE KEY uq_item_booking_ticket (booking_id, ticket_type_id)
) ENGINE=InnoDB;
