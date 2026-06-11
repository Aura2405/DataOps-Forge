/**
 * DataOps Forge — server.js
 * Node.js / Express backend with RBAC-enforced APIs
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── File paths ────────────────────────────────────────────────────────────────
const USER_DB = path.join(__dirname, 'data', 'user.json');
const TEST_DB = path.join(__dirname, 'data', 'test.json');

// ── JSON helpers ──────────────────────────────────────────────────────────────
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ═══════════════════════════════════════════════════════════
// RBAC DEFINITIONS
// ═══════════════════════════════════════════════════════════

const PERMISSIONS = {
  'Employee':       { create: true, read: 'own',          update: 'own_drafts',   delete: false,          approve: false,        tier: 1 },
  'Senior Employee':{ create: true, read: 'team',         update: 'team',         delete: false,          approve: 'review_only',tier: 2 },
  'Project Lead':   { create: true, read: 'project',      update: 'project',      delete: 'soft_project', approve: true,         tier: 3 },
  'Manager':        { create: true, read: 'department',   update: 'department',   delete: 'soft',         approve: true,         tier: 4 },
  'Senior Manager': { create: true, read: 'multi_project',update: 'multi_project',delete: 'soft_restore', approve: true,         tier: 5 },
  'Director':       { create: true, read: 'organization', update: 'organization', delete: 'permanent',    approve: true,         tier: 6 },
};

// ── RBAC Middleware factory ───────────────────────────────────────────────────
function requirePermission(action) {
  return (req, res, next) => {
    // Expect position + employeeId in body or query
    const position   = req.body?.userPosition || req.query?.userPosition;
    const employeeId = req.body?.employeeId   || req.query?.employeeId;

    if (!position) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no position provided.' });
    }

    const perms = PERMISSIONS[position];
    if (!perms) {
      return res.status(403).json({ success: false, message: `Unknown role: ${position}` });
    }

    // Attach to request for downstream use
    req.rbac = { position, employeeId, perms };

    // Check the specific action
    if (action === 'create' && !perms.create) {
      return res.status(403).json({ success: false, message: `Role '${position}' cannot create test cases.` });
    }
    if (action === 'delete' && !perms.delete) {
      return res.status(403).json({ success: false, message: `Role '${position}' cannot delete test cases.` });
    }
    if (action === 'approve' && !perms.approve) {
      return res.status(403).json({ success: false, message: `Role '${position}' cannot approve test cases.` });
    }

    next();
  };
}

// ═══════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const users = readJSON(USER_DB);
  const user  = users.find(u => u.email === email && u.password === password);

  if (user) {
    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        name:       user.name,
        email:      user.email,
        employeeId: user.employeeId,
        position:   user.position
      }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid email or password.' });
});

// POST /api/register
app.post('/api/register', (req, res) => {
  const { name, position, employeeId, email, password } = req.body;

  if (!name || !position || !employeeId || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const validPositions = Object.keys(PERMISSIONS);
  if (!validPositions.includes(position)) {
    return res.status(400).json({ success: false, message: `Invalid position: ${position}` });
  }

  // Server-side password policy enforcement
  const pwdErrors = [];
  if (password.length < 8)               pwdErrors.push('at least 8 characters');
  if (!/[a-z]/.test(password))           pwdErrors.push('one lowercase letter');
  if (!/[a-zA-Z]/.test(password))        pwdErrors.push('one letter');
  if (!/[0-9]/.test(password))           pwdErrors.push('one numeral');
  if (!/[^a-zA-Z0-9]/.test(password))   pwdErrors.push('one special character');
  if (pwdErrors.length) {
    return res.status(400).json({ success: false, message: `Password must contain: ${pwdErrors.join(', ')}.` });
  }

  const users = readJSON(USER_DB);

  if (users.find(u => u.employeeId === employeeId)) {
    return res.status(409).json({ success: false, message: 'Employee ID already exists.' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ success: false, message: 'Email address already registered.' });
  }

  const newUser = {
    name,
    position,
    employeeId,
    email,
    password,
    createdAt:   new Date().toISOString(),
    permissions: PERMISSIONS[position],
    testCases:   []
  };

  users.push(newUser);
  writeJSON(USER_DB, users);

  return res.status(201).json({ success: true, message: 'Registration successful.' });
});

// ═══════════════════════════════════════════════════════════
// PROJECTS ROUTE  (static seed — extendable in Week 2)
// ═══════════════════════════════════════════════════════════

const SEED_PROJECTS = [
  { id: 'PRJ-001', name: 'Project Alpha  — Core Platform'     },
  { id: 'PRJ-002', name: 'Project Beta   — Mobile App'        },
  { id: 'PRJ-003', name: 'Project Gamma  — API Gateway'       },
  { id: 'PRJ-004', name: 'Project Delta  — Data Pipeline'     },
  { id: 'PRJ-005', name: 'Project Epsilon — Security Hardening'},
];

// GET /api/projects
app.get('/api/projects', (req, res) => {
  res.json({ success: true, projects: SEED_PROJECTS });
});

// ═══════════════════════════════════════════════════════════
// TEST CASE ROUTES
// ═══════════════════════════════════════════════════════════

// POST /api/test-cases — create a new test case (RBAC: create)
app.post('/api/test-cases', requirePermission('create'), (req, res) => {
  const { payload } = req.body;
  const { position, employeeId } = req.rbac;

  if (!payload || !payload.testCaseId || !payload.testCaseName) {
    return res.status(400).json({ success: false, message: 'Invalid test case payload.' });
  }

  const required = ['testCaseName', 'description', 'projectId', 'testingType', 'priority', 'environment'];
  for (const field of required) {
    if (!payload[field] || !payload[field].toString().trim()) {
      return res.status(400).json({ success: false, message: `Field '${field}' is required.` });
    }
  }

  const testCases = readJSON(TEST_DB);

  if (testCases.find(tc => tc.testCaseId === payload.testCaseId)) {
    return res.status(409).json({ success: false, message: 'Test Case ID already exists.' });
  }

  const now = new Date().toISOString();
  const finalPayload = {
    ...payload,
    createdBy:        employeeId || payload.createdBy,
    status:           'Draft',
    isApproved:       false,          // ← always starts unapproved
    approvedBy:       null,
    approvedAt:       null,
    version:          1,
    isDeleted:        false,
    deletedAt:        null,
    creatorPosition:  position,
    createdTimestamp: payload.createdTimestamp || now,
    updatedTimestamp: now,
  };

  testCases.push(finalPayload);
  writeJSON(TEST_DB, testCases);

  const users = readJSON(USER_DB);
  const userIdx = users.findIndex(u => u.employeeId === employeeId);
  if (userIdx !== -1) {
    users[userIdx].testCases = users[userIdx].testCases || [];
    users[userIdx].testCases.push(payload.testCaseId);
    writeJSON(USER_DB, users);
  }

  return res.status(201).json({ success: true, message: 'Test case created successfully.', testCaseId: payload.testCaseId });
});

// GET /api/test-cases — RBAC-scoped read
app.get('/api/test-cases', (req, res) => {
  const position   = req.query.userPosition;
  const employeeId = req.query.employeeId;

  if (!position) {
    return res.status(401).json({ success: false, message: 'Unauthorized: no position provided.' });
  }

  const perms = PERMISSIONS[position];
  if (!perms) {
    return res.status(403).json({ success: false, message: `Unknown role: ${position}` });
  }

  let testCases = readJSON(TEST_DB).filter(tc => !tc.isDeleted);
  const scope   = perms.read;

  // Apply RBAC scope filter
  // 'own'          → only test cases created by this employee
  // 'team'         → own + same creatorPosition tier (same or lower)
  // 'project'      → all test cases (project lead sees all in system for now; project assignment Week 4)
  // 'department'   → all test cases  (department scoping requires project→dept mapping, future)
  // 'multi_project'→ all
  // 'organization' → all
  if (scope === 'own') {
    testCases = testCases.filter(tc => tc.createdBy === employeeId);
  } else if (scope === 'team') {
    // Senior Employee sees own + Employee-created cases
    const ownTierPerms  = PERMISSIONS[position];
    const lowerTiers    = Object.entries(PERMISSIONS)
      .filter(([, p]) => p.tier <= ownTierPerms.tier)
      .map(([pos]) => pos);
    testCases = testCases.filter(tc => tc.createdBy === employeeId || lowerTiers.includes(tc.creatorPosition));
  }
  // project / department / multi_project / organization → no server-side restriction for now
  // Full scoping requires a project membership model (Week 4+)

  return res.json({ success: true, count: testCases.length, testCases });
});

// ═══════════════════════════════════════════════════════════
// DEFAULT ROUTE
// ═══════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.path}` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   DataOps Forge — Server Running             ║`);
  console.log(`║   http://localhost:${PORT}                      ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});