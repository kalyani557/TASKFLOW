# TaskFlow – Internship Portal
### Role-Based Task Management System

A professional, full-stack task management system built for internship teams.
Features role-based access (Admin / Member), MySQL persistence, and a clean dark UI.

---

## Tech Stack
| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | HTML5 + CSS3 + Vanilla JS           |
| Backend  | Node.js v18+ + Express.js           |
| Database | MySQL 8.0+                          |
| Auth     | Express Session + bcryptjs          |

---

## Project Structure

```
taskflow/
├── frontend/
│   └── index.html          ← Complete single-file frontend
├── backend/
│   ├── server.js           ← Express app + all API routes
│   ├── package.json
│   ├── .env.example        ← Copy to .env and configure
│   ├── config/
│   │   └── database.js     ← MySQL connection pool
│   └── scripts/
│       └── seed.js         ← Database seeder (run once)
└── database/
    └── schema.sql          ← MySQL schema (run first)
```

---

## Setup Instructions

### Prerequisites
- Node.js v16 or higher
- MySQL 8.0 or higher (running locally or remote)

---

### Step 1 — Create the Database

Open your MySQL terminal or MySQL Workbench and run:

```sql
mysql -u root -p < database/schema.sql
```

Or manually in MySQL:
```sql
CREATE DATABASE taskflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Step 2 — Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=taskflow_db
SESSION_SECRET=change_this_to_a_long_random_string
FRONTEND_URL=http://localhost:5500
```

---

### Step 3 — Install Dependencies & Seed Database

```bash
cd backend
npm install
npm run seed
```

The seed script creates:
- Admin account: **rameshwar / admin123**
- Member accounts: **priya / member123**, **amit / member123**, **neha / member123**
- 5 sample tasks across the team

---

### Step 4 — Start the Backend

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server runs at: `http://localhost:3000`
Health check: `http://localhost:3000/api/health`

---

### Step 5 — Open the Frontend

**Option A — VS Code Live Server (Recommended)**
1. Open `frontend/index.html` in VS Code
2. Right-click → Open with Live Server
3. Runs at `http://localhost:5500`

**Option B — Direct file open**
1. Open `frontend/index.html` directly in your browser
2. Note: Update `const API = 'http://localhost:3000/api'` in the HTML if needed

> The frontend automatically falls back to **offline / localStorage mode** if the backend is not running — great for demos.

---

## API Reference

### Authentication
| Method | Endpoint         | Description        | Access |
|--------|------------------|--------------------|--------|
| POST   | /api/auth/login  | Login              | Public |
| POST   | /api/auth/logout | Logout             | Auth   |
| GET    | /api/auth/me     | Current user info  | Auth   |

### Users (Admin only)
| Method | Endpoint         | Description        |
|--------|------------------|--------------------|
| GET    | /api/users       | Get all members    |
| POST   | /api/users       | Add new member     |
| DELETE | /api/users/:id   | Remove member      |

### Tasks
| Method | Endpoint                         | Description                        | Access |
|--------|----------------------------------|------------------------------------|--------|
| GET    | /api/tasks                       | All tasks (admin) / own (member)   | Auth   |
| GET    | /api/tasks/:id                   | Get single task                    | Auth   |
| POST   | /api/tasks                       | Create task                        | Admin  |
| PUT    | /api/tasks/:id                   | Full edit task                     | Admin  |
| PATCH  | /api/tasks/:id/member-update     | Update status + comments           | Member |
| DELETE | /api/tasks/:id                   | Delete task                        | Admin  |

### Query Parameters for GET /api/tasks (Admin)
- `search` — search title/description
- `member` — filter by member ID
- `status` — filter by status (Completed, In Progress, Ongoing, Incomplete)
- `date` — filter by assigned date (YYYY-MM-DD)

---

## User Roles

### Admin (Rameshwar)
- Full dashboard with team statistics
- Assign, edit, delete tasks for any member
- Manage team members (add/remove)
- Filter and search all tasks

### Member
- See **only their own** tasks (enforced server-side)
- Update task status and add comments
- Cannot edit task title, description, or assigned date

---

## Security Features
- Passwords hashed with **bcrypt** (10 rounds)
- Server-side role enforcement on every route
- **Members cannot access other members' tasks** (checked in SQL + middleware)
- HTTP-only session cookies
- CORS configured to frontend origin only
- SQL injection prevention via parameterized queries

---

## Customization

### Adding More Status Options
Edit the `ENUM` in `database/schema.sql` and update the dropdowns in `frontend/index.html`.

### Changing Session Duration
In `backend/server.js`, find `maxAge: 8 * 60 * 60 * 1000` and change the hours.

### Production Deployment
1. Set `NODE_ENV=production` in `.env`
2. Set `SESSION_SECRET` to a long random string
3. Set `FRONTEND_URL` to your actual domain
4. Use a process manager like PM2: `pm2 start server.js`
5. Put Nginx in front for SSL termination

---

## Screenshots

| Screen | Description |
|--------|-------------|
| Login  | Role-based login with credentials |
| Admin Dashboard | Stats overview + recent tasks |
| All Tasks | Filter by member / status / date |
| Team Members | Add / remove / assign tasks |
| Member View | Personal task list with update controls |

---

*Built for internship team management. Replace demo credentials before production use.*
