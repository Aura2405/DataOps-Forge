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

  const includeDeleted = req.query.includeDeleted === 'true' || req.query.includeDeleted === '1';
  if (includeDeleted && !perms.delete) {
    return res.status(403).json({ success: false, message: 'Unauthorized to view deleted test cases.' });
  }

  let testCases = readJSON(TEST_DB);
  if (!includeDeleted) testCases = testCases.filter(tc => !tc.isDeleted);
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

// PUT /api/test-cases/:id — update a test case (RBAC: update scope enforced)
app.put('/api/test-cases/:id', (req, res) => {
  const { id }         = req.params;
  const { updates, userPosition, employeeId } = req.body;

  if (!userPosition) return res.status(401).json({ success: false, message: 'Unauthorized.' });

  const perms = PERMISSIONS[userPosition];
  if (!perms) return res.status(403).json({ success: false, message: `Unknown role: ${userPosition}` });

  const testCases = readJSON(TEST_DB);
  const idx       = testCases.findIndex(tc => tc.testCaseId === id && !tc.isDeleted);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Test case not found.' });

  const tc = testCases[idx];

  // ── RBAC update scope checks ──────────────────────────────
  const scope = perms.update;

  if (scope === 'own_drafts') {
    if (tc.createdBy !== employeeId) {
      return res.status(403).json({ success: false, message: 'You can only update your own test cases.' });
    }
  } else if (scope === 'team') {
    const lowerTiers = Object.entries(PERMISSIONS).filter(([,p]) => p.tier <= perms.tier).map(([pos]) => pos);
    if (!lowerTiers.includes(tc.creatorPosition) && tc.createdBy !== employeeId) {
      return res.status(403).json({ success: false, message: 'You can only update test cases created by you or your team members.' });
    }
    if (tc.isApproved) return res.status(403).json({ success: false, message: 'Approved test cases cannot be edited.' });
  } else if (scope === 'project' || scope === 'department' || scope === 'multi_project') {
    if (tc.isApproved) return res.status(403).json({ success: false, message: 'Approved test cases cannot be edited without Director privileges.' });
  }

  // ── Apply allowed field updates ───────────────────────────
  const UPDATABLE_FIELDS = ['testCaseName','description','projectId','testingType','testingTypeId','priority','environment','tags','dynamicData','status'];
  const patched = { ...tc };
  UPDATABLE_FIELDS.forEach(field => {
    if (updates[field] !== undefined) patched[field] = updates[field];
  });

  patched.version          = (tc.version || 1) + 1;
  patched.updatedTimestamp = new Date().toISOString();
  patched.lastUpdatedBy    = employeeId;
  patched.lastUpdatedByName= updates.lastUpdatedByName || employeeId;

  // Reset approval state whenever a case is changed after review/approval
  if (tc.status !== 'Draft' || tc.isApproved) {
    patched.isApproved = false;
    patched.approvedBy = null;
    patched.approvedAt = null;
    patched.status     = 'Draft';
    patched.reviewComment = null;
    patched.reviewedBy = null;
    patched.reviewedAt = null;
  }

  testCases[idx] = patched;
  writeJSON(TEST_DB, testCases);

  return res.json({ success: true, message: 'Test case updated successfully.', testCase: patched });
});

// POST /api/test-cases/:id/review — review, approve or reject a draft test case
app.post('/api/test-cases/:id/review', (req, res) => {
  const { id } = req.params;
  const { action, comment, userPosition, employeeId, reviewerName } = req.body;

  if (!userPosition) return res.status(401).json({ success: false, message: 'Unauthorized.' });

  const perms = PERMISSIONS[userPosition];
  if (!perms) return res.status(403).json({ success: false, message: `Unknown role: ${userPosition}` });

  if (!['review', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid review action.' });
  }

  const testCases = readJSON(TEST_DB);
  const idx = testCases.findIndex(tc => tc.testCaseId === id && !tc.isDeleted);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Draft test case not found.' });

  const tc = testCases[idx];
  if (tc.status !== 'Draft') {
    return res.status(400).json({ success: false, message: 'This test case is no longer in the draft review queue.' });
  }

  if (action === 'review') {
    if (perms.approve !== 'review_only') {
      return res.status(403).json({ success: false, message: 'Only Senior Employees can submit a review.' });
    }
    if (!comment || String(comment).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Review comments must be at least 10 characters long.' });
    }
  } else if (action === 'approve' || action === 'reject') {
    if (!perms.approve) {
      return res.status(403).json({ success: false, message: 'Only Project Lead and above can approve or reject test cases.' });
    }
    if (!comment || String(comment).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Review comments are required for approval/rejection.' });
    }
  }

  const now = new Date().toISOString();
  const updated = {
    ...tc,
    status: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Reviewed',
    isApproved: action === 'approve',
    approvedBy: action === 'approve' ? (reviewerName || employeeId) : null,
    approvedAt: action === 'approve' ? now : null,
    reviewedBy: reviewerName || employeeId,
    reviewedAt: now,
    reviewComment: comment ? String(comment).trim() : null,
    updatedTimestamp: now,
    version: (tc.version || 1) + 1,
  };

  testCases[idx] = updated;
  writeJSON(TEST_DB, testCases);

  return res.json({ success: true, message: `Test case ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed'} successfully.`, testCase: updated });
});

// DELETE /api/test-cases/:id — delete a test case (RBAC: delete scope enforced)
app.delete('/api/test-cases/:id', (req, res) => {
  const { id }          = req.params;
  const { userPosition, employeeId, deletedByName, deleteType } = req.body;

  if (!userPosition) return res.status(401).json({ success: false, message: 'Unauthorized.' });

  const perms = PERMISSIONS[userPosition];
  if (!perms) return res.status(403).json({ success: false, message: `Unknown role: ${userPosition}` });
  if (!perms.delete) return res.status(403).json({ success: false, message: `Role '${userPosition}' does not have delete permission.` });

  const testCases = readJSON(TEST_DB);
  const idx       = testCases.findIndex(tc => tc.testCaseId === id);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Test case not found.' });

  const tc = testCases[idx];

  // ── RBAC delete scope check ───────────────────────────────
  const deleteScope = perms.delete;
  const resolvedDeleteType = deleteType || (deleteScope === 'permanent' ? 'permanent' : 'soft');

  if (resolvedDeleteType === 'permanent' && deleteScope !== 'permanent') {
    return res.status(403).json({ success: false, message: 'Only Directors can permanently delete test cases.' });
  }

  if (tc.isDeleted && resolvedDeleteType === 'soft') {
    return res.status(400).json({ success: false, message: 'Test case is already deleted.' });
  }

  if (deleteScope === 'soft_project') {
    // Project Lead: can only delete cases they created or lower-tier within project
    const lowerTiers = Object.entries(PERMISSIONS).filter(([,p]) => p.tier <= perms.tier).map(([pos]) => pos);
    if (!lowerTiers.includes(tc.creatorPosition) && tc.createdBy !== employeeId) {
      return res.status(403).json({ success: false, message: 'You can only delete test cases created by you or your team members.' });
    }
  }
  // Manager / Senior Manager / Director — full or broad scope, allow

  // ── Perform delete ─────────────────────────────────────────
  let deletedTypeLabel;
  if (resolvedDeleteType === 'permanent') {
    // Director: hard delete — remove from array entirely
    testCases.splice(idx, 1);
    deletedTypeLabel = 'permanently deleted';
  } else {
    // Soft delete — mark isDeleted
    testCases[idx] = {
      ...tc,
      isDeleted:       true,
      deletedAt:       new Date().toISOString(),
      deletedBy:       employeeId,
      deletedByName:   deletedByName || employeeId,
    };
    deletedTypeLabel = 'soft deleted';
  }

  writeJSON(TEST_DB, testCases);

  // Remove from user's testCases array when the case is no longer active
  const users   = readJSON(USER_DB);
  const userIdx = users.findIndex(u => u.employeeId === tc.createdBy);
  if (userIdx !== -1) {
    users[userIdx].testCases = (users[userIdx].testCases || []).filter(tid => tid !== id);
    writeJSON(USER_DB, users);
  }

  return res.json({ success: true, message: `Test case ${deletedTypeLabel} successfully.`, deleteType: deletedTypeLabel });
});

// POST /api/test-cases/:id/restore — restore a soft-deleted test case
app.post('/api/test-cases/:id/restore', (req, res) => {
  const { id } = req.params;
  const { userPosition, employeeId, restoredByName } = req.body;

  if (!userPosition) return res.status(401).json({ success: false, message: 'Unauthorized.' });

  const perms = PERMISSIONS[userPosition];
  if (!perms) return res.status(403).json({ success: false, message: `Unknown role: ${userPosition}` });
  if (perms.delete !== 'soft_restore' && perms.delete !== 'permanent') {
    return res.status(403).json({ success: false, message: 'Role does not have restore privileges.' });
  }

  const testCases = readJSON(TEST_DB);
  const idx = testCases.findIndex(tc => tc.testCaseId === id && tc.isDeleted);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Deleted test case not found.' });

  const tc = testCases[idx];
  testCases[idx] = {
    ...tc,
    isDeleted:       false,
    deletedAt:       null,
    deletedBy:       null,
    deletedByName:   null,
    restoredAt:      new Date().toISOString(),
    restoredBy:      employeeId,
    restoredByName:  restoredByName || employeeId,
    updatedTimestamp: new Date().toISOString(),
  };

  writeJSON(TEST_DB, testCases);

  // Re-add to creator's active test case list if missing
  const users = readJSON(USER_DB);
  const userIdx = users.findIndex(u => u.employeeId === tc.createdBy);
  if (userIdx !== -1) {
    users[userIdx].testCases = users[userIdx].testCases || [];
    if (!users[userIdx].testCases.includes(id)) {
      users[userIdx].testCases.push(id);
      writeJSON(USER_DB, users);
    }
  }

  return res.json({ success: true, message: 'Test case restored successfully.', testCase: testCases[idx] });
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
