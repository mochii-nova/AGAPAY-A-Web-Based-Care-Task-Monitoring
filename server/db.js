const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // DATE columns (birth_date, shift_date, date_hired) come back as plain
  // 'YYYY-MM-DD' text, so they never shift by a day because of time zones.
  dateStrings: ['DATE'],
});

module.exports = pool;
