// config/database.js
// MySQL connection pool using mysql2/promise
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || 'pk@30',
  database:           process.env.DB_NAME     || 'taskflow_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  dateStrings:        true,           // Return dates as strings (not JS Date objects)
  timezone:           '+00:00'
});

module.exports = pool;
