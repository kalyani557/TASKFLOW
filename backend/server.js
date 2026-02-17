// ============================================================
//  TaskFlow – Express + MySQL Backend Server
//  Run: npm install && node scripts/seed.js && npm start
// ============================================================
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const bcrypt         = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db             = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'taskflow_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000   // 8 hours
  }
}));

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ─── HELPER ──────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
//  AUTH ROUTES
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid username or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.user = {
      id:       user.id,
      name:     user.name,
      username: user.username,
      role:     user.role
    };

    res.json({ user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ============================================================
//  USER ROUTES
// ============================================================

// GET /api/users  – Admin: get all members
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, username, role, created_at FROM users WHERE role = "member" ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id
app.get('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, username, role FROM users WHERE id = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users  – Admin: add member
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password)
    return res.status(400).json({ error: 'Name, username and password are required' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length) return res.status(409).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const id   = uuidv4();
    await db.query(
      'INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, "member")',
      [id, name, username, hash]
    );
    res.status(201).json({ id, name, username, role: 'member' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id  – Admin: remove member
app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.session.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await db.query('DELETE FROM users WHERE id = ? AND role = "member"', [req.params.id]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
//  TASK ROUTES
// ============================================================

// GET /api/tasks  – Admin: all tasks (with filters) | Member: own tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { search, member, status, date, assignedTo } = req.query;
    let sql = `
      SELECT
        t.id, t.title, t.description AS desc, t.assigned_to AS assignedTo,
        t.assigned_by AS assignedBy, t.assigned_date AS date, t.status,
        t.comments, t.updated_at AS updatedAt,
        u1.name AS assigneeName, u2.name AS assignedByName
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to  = u1.id
      LEFT JOIN users u2 ON t.assigned_by = u2.id
      WHERE 1=1
    `;
    const params = [];

    // Members can only see their own tasks
    if (req.session.user.role === 'member') {
      sql += ' AND t.assigned_to = ?';
      params.push(req.session.user.id);
    } else {
      // Admin filters
      if (assignedTo) { sql += ' AND t.assigned_to = ?'; params.push(assignedTo); }
      if (member)     { sql += ' AND t.assigned_to = ?'; params.push(member); }
    }

    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (date)   { sql += ' AND t.assigned_date = ?'; params.push(date); }
    if (search) {
      sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY t.updated_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        t.id, t.title, t.description AS desc, t.assigned_to AS assignedTo,
        t.assigned_by AS assignedBy, t.assigned_date AS date, t.status,
        t.comments, t.updated_at AS updatedAt,
        u1.name AS assigneeName, u2.name AS assignedByName
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.assigned_by = u2.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = rows[0];
    // Members can only view their own tasks
    if (req.session.user.role === 'member' && task.assignedTo !== req.session.user.id)
      return res.status(403).json({ error: 'Access denied' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks  – Admin only
app.post('/api/tasks', requireAuth, requireAdmin, async (req, res) => {
  const { title, desc, assignedTo, assignedBy, date, status, comments } = req.body;
  if (!title || !assignedTo) return res.status(400).json({ error: 'Title and assignedTo are required' });

  try {
    const id = uuidv4();
    await db.query(
      `INSERT INTO tasks (id, title, description, assigned_to, assigned_by, assigned_date, status, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, desc||'', assignedTo, assignedBy || req.session.user.id,
       date || today(), status || 'Incomplete', comments||'']
    );
    res.status(201).json({ id, message: 'Task created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id  – Admin: full edit
app.put('/api/tasks/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, desc, assignedTo, status, date, comments } = req.body;
  if (!title || !assignedTo) return res.status(400).json({ error: 'Title and assignedTo are required' });

  try {
    await db.query(
      `UPDATE tasks SET title=?, description=?, assigned_to=?, status=?, assigned_date=?, comments=?
       WHERE id=?`,
      [title, desc||'', assignedTo, status||'Incomplete', date||today(), comments||'', req.params.id]
    );
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id/member-update  – Member: update status + comments only
app.patch('/api/tasks/:id/member-update', requireAuth, async (req, res) => {
  const { status, comments } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    // Verify task belongs to this member
    const [rows] = await db.query(
      'SELECT assigned_to FROM tasks WHERE id = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    if (req.session.user.role === 'member' && rows[0].assigned_to !== req.session.user.id)
      return res.status(403).json({ error: 'Access denied' });

    await db.query(
      'UPDATE tasks SET status=?, comments=? WHERE id=?',
      [status, comments||'', req.params.id]
    );
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id  – Admin only
app.delete('/api/tasks/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── START ───────────────────────────────────────────────────
db.getConnection()
  .then(conn => {
    conn.release();
    console.log('✅  MySQL connected');
    app.listen(PORT, () => {
      console.log(`🚀  TaskFlow server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    console.error('    Check your .env DB_* settings and ensure MySQL is running.');
    process.exit(1);
  });

module.exports = app;
