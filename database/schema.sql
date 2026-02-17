-- ============================================================
--  TaskFlow – Internship Portal
--  MySQL Database Schema
--  Run this file first: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS taskflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskflow_db;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  name        VARCHAR(100) NOT NULL,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,      -- bcrypt hash
  role        ENUM('admin','member') NOT NULL DEFAULT 'member',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ─── TASKS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  assigned_to   VARCHAR(36)  NOT NULL,
  assigned_by   VARCHAR(36)  NOT NULL,
  assigned_date DATE         NOT NULL,
  status        ENUM('Completed','In Progress','Ongoing','Incomplete') NOT NULL DEFAULT 'Incomplete',
  comments      TEXT,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_status (status),
  INDEX idx_assigned_date (assigned_date)
) ENGINE=InnoDB;

-- ─── SESSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128) NOT NULL,
  expires     BIGINT       NOT NULL,
  data        TEXT,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;

-- ─── SEED DATA ────────────────────────────────────────────────
-- Default admin: rameshwar / admin123
-- Default members: priya / member123, amit / member123, neha / member123
-- Passwords are bcrypt hashed ($2b$10$...)

INSERT IGNORE INTO users (id, name, username, password, role) VALUES
('u-admin-001', 'Rameshwar', 'rameshwar',
 '$2b$10$YourHashHereReplaceThis.RameshwarAdmin123HashXXXXXXXXXX', 'admin'),
('u-mem-001', 'Priya Sharma', 'priya',
 '$2b$10$YourHashHereReplaceThis.PriyaMember123HashXXXXXXXXXXXX', 'member'),
('u-mem-002', 'Amit Verma', 'amit',
 '$2b$10$YourHashHereReplaceThis.AmitMember123HashXXXXXXXXXXXXXX', 'member'),
('u-mem-003', 'Neha Gupta', 'neha',
 '$2b$10$YourHashHereReplaceThis.NehaMember123HashXXXXXXXXXXXXXX', 'member');

-- NOTE: Run `node scripts/seed.js` after setup to insert users with proper bcrypt hashes.
