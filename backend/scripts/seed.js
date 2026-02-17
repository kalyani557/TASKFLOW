// scripts/seed.js
// Run this once after creating the database:
//   node scripts/seed.js
// ─────────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'taskflow_db',
    multipleStatements: true
  });

  console.log('🌱  Seeding TaskFlow database...\n');

  const today = new Date().toISOString().slice(0, 10);

  // ── Users ───────────────────────────────────────────────────
  const users = [
    { id: 'u-admin-001', name: 'Rameshwar',    username: 'rameshwar', password: 'admin123',  role: 'admin'  },
    { id: 'u-mem-001',   name: 'Priya Sharma', username: 'priya',     password: 'member123', role: 'member' },
    { id: 'u-mem-002',   name: 'Amit Verma',   username: 'amit',      password: 'member123', role: 'member' },
    { id: 'u-mem-003',   name: 'Neha Gupta',   username: 'neha',      password: 'member123', role: 'member' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, ROUNDS);
    await conn.query(
      `INSERT INTO users (id, name, username, password, role)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password)`,
      [u.id, u.name, u.username, hash, u.role]
    );
    console.log(`  ✓ User: ${u.username} (${u.role})  →  password: ${u.password}`);
  }

  // ── Sample Tasks ────────────────────────────────────────────
  const tasks = [
    {
      id: uuidv4(),
      title: 'Weekly Report Submission',
      description: 'Compile and submit the weekly progress report by Friday 5 PM. Include all completed items and blockers.',
      assigned_to: 'u-mem-001',
      assigned_by: 'u-admin-001',
      date: today,
      status: 'In Progress',
      comments: 'Working on data compilation.'
    },
    {
      id: uuidv4(),
      title: 'UI Mockup Review',
      description: 'Review the Figma mockups for the new dashboard and provide detailed feedback.',
      assigned_to: 'u-mem-002',
      assigned_by: 'u-admin-001',
      date: today,
      status: 'Completed',
      comments: 'All screens reviewed and approved.'
    },
    {
      id: uuidv4(),
      title: 'API Integration Testing',
      description: 'Test all REST endpoints against the staging environment and log any bugs found.',
      assigned_to: 'u-mem-001',
      assigned_by: 'u-admin-001',
      date: today,
      status: 'Ongoing',
      comments: ''
    },
    {
      id: uuidv4(),
      title: 'Database Schema Update',
      description: 'Implement the updated schema per migration document v2.1.',
      assigned_to: 'u-mem-003',
      assigned_by: 'u-admin-001',
      date: today,
      status: 'Incomplete',
      comments: 'Waiting for final spec confirmation.'
    },
    {
      id: uuidv4(),
      title: 'Sprint Retrospective Notes',
      description: 'Document findings from this sprint\'s retrospective meeting and share with team.',
      assigned_to: 'u-mem-002',
      assigned_by: 'u-admin-001',
      date: today,
      status: 'In Progress',
      comments: ''
    },
  ];

  console.log('');
  for (const t of tasks) {
    await conn.query(
      `INSERT IGNORE INTO tasks
         (id, title, description, assigned_to, assigned_by, assigned_date, status, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.date, t.status, t.comments]
    );
    console.log(`  ✓ Task: "${t.title}" → ${t.status}`);
  }

  await conn.end();
  console.log('\n✅  Seeding complete!\n');
  console.log('   Login credentials:');
  console.log('   Admin  : rameshwar / admin123');
  console.log('   Members: priya / member123 | amit / member123 | neha / member123\n');
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
