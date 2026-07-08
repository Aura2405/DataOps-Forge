const API_BASE = 'http://localhost:3000/api';

// ═══════════════════════════════════════════════════════════
// RBAC — PERMISSION DEFINITIONS  (shared frontend reference)
// ═══════════════════════════════════════════════════════════

const PERMISSIONS = {
  'Employee': { create: true, read: 'own', update: 'own_drafts', delete: false, approve: false, tier: 1, additional: ['Submit for Review'] },
  'Senior Employee': { create: true, read: 'team', update: 'team', delete: false, approve: 'review_only', tier: 2, additional: ['Review & Comment'] },
  'Project Lead': { create: true, read: 'project', update: 'project', delete: 'soft_project', approve: true, tier: 3, additional: ['Approve/Reject Test Cases'] },
  'Manager': { create: true, read: 'department', update: 'department', delete: 'soft', approve: true, tier: 4, additional: ['Manage Users & Assign Projects'] },
  'Senior Manager': { create: true, read: 'multi_project', update: 'multi_project', delete: 'soft_restore', approve: true, tier: 5, additional: ['Create Templates', 'Generate Reports'] },
  'Director': { create: true, read: 'organization', update: 'organization', delete: 'permanent', approve: true, tier: 6, additional: ['Governance', 'Compliance', 'Audit Control'] },
};

const PERMISSION_DESCRIPTIONS = {
  'Employee': { read: 'Own Test Cases', update: 'Own Drafts Only' },
  'Senior Employee': { read: 'Team Test Cases', update: 'Team Test Cases' },
  'Project Lead': { read: 'Project Test Cases', update: 'Project Scope' },
  'Manager': { read: 'Department / Project', update: 'Department Scope' },
  'Senior Manager': { read: 'Multiple Projects', update: 'Multiple Projects' },
  'Director': { read: 'Organization-wide', update: 'Organization-wide' },
};

const DELETE_DESCRIPTIONS = {
  'Employee': { icon: '❌', label: 'No Delete', cls: 'pb-denied' },
  'Senior Employee': { icon: '❌', label: 'No Delete', cls: 'pb-denied' },
  'Project Lead': { icon: '⚠️', label: 'Soft Delete (Project)', cls: 'pb-partial' },
  'Manager': { icon: '✅', label: 'Soft Delete', cls: 'pb-allowed' },
  'Senior Manager': { icon: '✅', label: 'Soft Delete + Restore', cls: 'pb-allowed' },
  'Director': { icon: '✅', label: 'Permanent Delete', cls: 'pb-allowed' },
};

function canCreate(position) { return PERMISSIONS[position]?.create === true; }

// ═══════════════════════════════════════════════════════════
// TESTING TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

const TESTING_TYPES = [
  { id: 'functional', label: 'Functional', icon: '🧩' },
  { id: 'api', label: 'API Testing', icon: '🔌' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'ui', label: 'UI / UX', icon: '🖥️' },
  { id: 'integration', label: 'Integration', icon: '🔗' },
  { id: 'regression', label: 'Regression', icon: '🔄' },
  { id: 'smoke', label: 'Smoke', icon: '💨' },
];

function typeIcon(typeIdOrLabel) {
  const t = TESTING_TYPES.find(x => x.id === typeIdOrLabel || x.label === typeIdOrLabel);
  return t ? t.icon : '🧪';
}

const DYNAMIC_FIELD_CONFIGS = {
  functional: {
    label: 'Functional Testing Fields',
    fields: [
      { id: 'preconditions', label: 'Preconditions', type: 'textarea', placeholder: 'e.g. User account exists and is active', required: false },
      { id: 'testSteps', label: 'Test Steps', type: 'steps', placeholder: 'e.g. Navigate to login page', required: true },
      { id: 'inputData', label: 'Input Data', type: 'textarea', placeholder: 'e.g. Username: admin, Password: test123', required: false },
      { id: 'expectedResult', label: 'Expected Result', type: 'text', placeholder: 'e.g. Dashboard displayed successfully', required: true },
      { id: 'postconditions', label: 'Postconditions', type: 'textarea', placeholder: 'e.g. Session token stored in cookies', required: false },
    ]
  },
  api: {
    label: 'API Testing Fields',
    fields: [
      { id: 'endpointUrl', label: 'Endpoint URL', type: 'text', placeholder: 'https://api.example.com/v1/login', required: true },
      { id: 'httpMethod', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'], required: true },
      { id: 'requestHeaders', label: 'Request Headers', type: 'textarea', placeholder: 'Content-Type: application/json', required: false },
      { id: 'requestBody', label: 'Request Body (JSON)', type: 'textarea', placeholder: '{\n  "username": "admin"\n}', required: false },
      { id: 'expectedResponse', label: 'Expected Response', type: 'textarea', placeholder: '{\n  "token": "..."\n}', required: false },
      { id: 'expectedStatus', label: 'Expected Status Code', type: 'text', placeholder: 'e.g. 200 OK', required: true },
    ]
  },
  performance: {
    label: 'Performance Testing Fields',
    fields: [
      { id: 'concurrentUsers', label: 'Concurrent Users', type: 'text', placeholder: 'e.g. 100', required: true },
      { id: 'rampUpTime', label: 'Ramp-Up Time (seconds)', type: 'text', placeholder: 'e.g. 60', required: true },
      { id: 'duration', label: 'Test Duration (seconds)', type: 'text', placeholder: 'e.g. 300', required: true },
      { id: 'expectedResponseTime', label: 'Expected Response Time (ms)', type: 'text', placeholder: 'e.g. < 500ms', required: true },
      { id: 'throughput', label: 'Expected Throughput (req/s)', type: 'text', placeholder: 'e.g. 200 req/s', required: false },
      { id: 'errorThreshold', label: 'Acceptable Error Rate (%)', type: 'text', placeholder: 'e.g. < 1%', required: false },
    ]
  },
  security: {
    label: 'Security Testing Fields',
    fields: [
      { id: 'threatVector', label: 'Threat Vector', type: 'text', placeholder: 'e.g. SQL Injection, XSS', required: true },
      { id: 'attackScenario', label: 'Attack Scenario', type: 'textarea', placeholder: 'Describe the attack flow…', required: true },
      { id: 'targetEndpoint', label: 'Target Endpoint/Component', type: 'text', placeholder: 'e.g. /api/auth/login', required: false },
      { id: 'tools', label: 'Tools / Frameworks', type: 'text', placeholder: 'e.g. OWASP ZAP, Burp Suite', required: false },
      { id: 'expectedBehavior', label: 'Expected Secure Behavior', type: 'textarea', placeholder: 'e.g. Returns 403, no data leaked', required: true },
      { id: 'cvssScore', label: 'CVSS Severity (estimated)', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: false },
    ]
  },
  ui: {
    label: 'UI / UX Testing Fields',
    fields: [
      { id: 'component', label: 'Component / Page', type: 'text', placeholder: 'e.g. Login Modal', required: true },
      { id: 'browser', label: 'Browser(s)', type: 'text', placeholder: 'e.g. Chrome 120, Firefox 121', required: false },
      { id: 'viewport', label: 'Viewport / Device', type: 'text', placeholder: 'e.g. 1440×900, iPhone 14', required: false },
      { id: 'testSteps', label: 'UI Test Steps', type: 'steps', placeholder: 'e.g. Click the Login button', required: true },
      { id: 'expectedUI', label: 'Expected UI Behaviour', type: 'textarea', placeholder: 'e.g. Modal closes and user redirected', required: true },
      { id: 'accessibility', label: 'Accessibility Check', type: 'textarea', placeholder: 'e.g. WCAG AA contrast', required: false },
    ]
  },
  integration: {
    label: 'Integration Testing Fields',
    fields: [
      { id: 'systemA', label: 'System A (Source)', type: 'text', placeholder: 'e.g. Payment Gateway', required: true },
      { id: 'systemB', label: 'System B (Target)', type: 'text', placeholder: 'e.g. Order Management System', required: true },
      { id: 'integrationFlow', label: 'Integration Flow', type: 'textarea', placeholder: 'Describe the data/event flow…', required: true },
      { id: 'dataFormat', label: 'Data Format / Protocol', type: 'text', placeholder: 'e.g. REST / JSON, SOAP / XML', required: false },
      { id: 'preconditions', label: 'Preconditions', type: 'textarea', placeholder: 'e.g. Both systems online & seeded', required: false },
      { id: 'expectedResult', label: 'Expected Outcome', type: 'textarea', placeholder: 'e.g. Order confirmed in OMS', required: true },
    ]
  },
  regression: {
    label: 'Regression Testing Fields',
    fields: [
      { id: 'featureUnderTest', label: 'Feature Under Test', type: 'text', placeholder: 'e.g. User Authentication', required: true },
      { id: 'relatedChangeRef', label: 'Related Change / PR Ref', type: 'text', placeholder: 'e.g. PR-4521, JIRA-887', required: false },
      { id: 'baselineVersion', label: 'Baseline Version', type: 'text', placeholder: 'e.g. v2.3.1', required: false },
      { id: 'testSteps', label: 'Regression Steps', type: 'steps', placeholder: 'e.g. Log in with valid credentials', required: true },
      { id: 'expectedResult', label: 'Expected Result', type: 'text', placeholder: 'e.g. No regression — login succeeds', required: true },
    ]
  },
  smoke: {
    label: 'Smoke Testing Fields',
    fields: [
      { id: 'buildVersion', label: 'Build Version', type: 'text', placeholder: 'e.g. build-20260607-001', required: true },
      { id: 'criticalPaths', label: 'Critical Paths to Verify', type: 'steps', placeholder: 'e.g. App launches without crash', required: true },
      { id: 'goNoGoThreshold', label: 'Go / No-Go Threshold', type: 'text', placeholder: 'e.g. All critical paths pass', required: true },
      { id: 'environmentHealth', label: 'Environment Health Check', type: 'textarea', placeholder: 'e.g. DB connection OK', required: false },
    ]
  }
};

// ═══════════════════════════════════════════════════════════
// PASSWORD VALIDATION
// ═══════════════════════════════════════════════════════════

const PWD_RULES = [
  { id: 'rule-len', test: v => v.length >= 8, label: 'At least 8 characters' },
  { id: 'rule-lower', test: v => /[a-z]/.test(v), label: 'One lowercase letter' },
  { id: 'rule-upper', test: v => /[a-zA-Z]/.test(v), label: 'One uppercase or any letter' },
  { id: 'rule-num', test: v => /[0-9]/.test(v), label: 'One numeral (0–9)' },
  { id: 'rule-special', test: v => /[^a-zA-Z0-9]/.test(v), label: 'One special character (!@#$…)' },
];

function validatePassword(value) {
  const results = PWD_RULES.map(r => ({ ...r, passed: r.test(value) }));
  const strength = results.filter(r => r.passed).length;
  return {
    passed: strength === PWD_RULES.length,
    strength,
    results
  };
}

function updatePasswordUI(value) {
  const { strength, results } = validatePassword(value);
  const fill = document.getElementById('pwdStrengthFill');
  if (fill) {
    fill.className = `pwd-strength-fill ${value ? 's' + strength : ''}`;
  }
  results.forEach(r => {
    const el = document.getElementById(r.id);
    if (!el) return;
    el.classList.toggle('passed', r.passed);
    el.classList.toggle('failed', value.length > 0 && !r.passed);
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3600);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showFieldError(el, hintId, message) {
  if (el) el.classList.add('input-error');
  const hint = document.getElementById(hintId);
  if (hint) {
    hint.textContent = message;
    hint.classList.add('visible');
  }
}

function clearFieldError(el, hintId) {
  if (el) el.classList.remove('input-error');
  const hint = document.getElementById(hintId);
  if (hint) {
    hint.classList.remove('visible');
  }
}

function textRules(value, minLength = 10) {
  const v = String(value || '').trim();
  return {
    valid: v.length >= minLength,
    message: `Must contain at least ${minLength} characters.`
  };
}

function numericRules(value) {
  const v = String(value || '').trim();
  return {
    valid: /^[0-9]+(\.[0-9]+)?$/.test(v),
    message: 'Only numeric values are allowed.'
  };
}

const NUMERIC_FIELDS = [
  'concurrentUsers',
  'rampUpTime',
  'duration',
  'expectedResponseTime',
  'throughput',
  'errorThreshold'
];

function setInputState(inputEl, hintEl, state, message = '') {
  if (!inputEl) return;
  inputEl.classList.remove('input-error', 'input-success');
  if (hintEl) { hintEl.classList.remove('visible'); hintEl.textContent = message; }
  if (state === 'error') { inputEl.classList.add('input-error'); if (message && hintEl) hintEl.classList.add('visible'); }
  if (state === 'success') { inputEl.classList.add('input-success'); }
}

function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function setLoading(btn, isLoading, originalText = '') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Please wait…';
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.textContent = originalText || btn.dataset.originalText || btn.textContent;
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

function generateUUID() {
  return 'TC-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function nowISO() { return new Date().toISOString(); }

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function wireNavBar(user) {
  const initials = (user.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const el = id => document.getElementById(id);
  if (el('navAvatar')) el('navAvatar').textContent = initials;
  if (el('navName')) el('navName').textContent = user.name || '—';
  if (el('navRole')) el('navRole').textContent = user.position || '—';
  el('navLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem('forge_user');
    window.location.href = 'index.html';
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyFilters(allCases, projectsMap) {
  const search = document.getElementById('filterSearch')?.value.trim().toLowerCase() || '';
  const project = document.getElementById('filterProject')?.value || '';
  const type = document.getElementById('filterType')?.value || '';
  const priority = document.getElementById('filterPriority')?.value || '';
  const env = document.getElementById('filterEnv')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';

  return allCases.filter(tc => {
    if (search) {
      const hay = [tc.testCaseId, tc.testCaseName, tc.description, tc.createdByName, tc.createdBy].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (project && tc.projectId !== project) return false;
    if (type && tc.testingTypeId !== type && tc.testingType !== type) return false;
    if (priority && tc.priority !== priority) return false;
    if (env && tc.environment !== env) return false;
    if (status) {
      if (status === 'Approved' && !tc.isApproved) return false;
      if (status === 'Draft' && tc.status !== 'Draft') return false;
      if (status === 'Pending' && tc.status !== 'Pending Review') return false;
    }
    return true;
  });
}

function wireSortButtons(onSort) {
  let sortField = 'createdTimestamp', sortDir = 'desc';
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      if (sortField === field) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      else { sortField = field; sortDir = 'desc'; }
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.textContent = btn.dataset.label + (sortDir === 'asc' ? ' ↑' : ' ↓');
      onSort(sortField, sortDir);
    });
  });
  return () => ({ sortField, sortDir });
}

function sortCases(cases, sortField, sortDir) {
  return [...cases].sort((a, b) => {
    let va = a[sortField] || '', vb = b[sortField] || '';
    if (sortField === 'createdTimestamp' || sortField === 'updatedTimestamp') {
      va = new Date(va); vb = new Date(vb);
    } else { va = va.toString().toLowerCase(); vb = vb.toString().toLowerCase(); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function wireFilterInputs(onChange) {
  ['filterSearch', 'filterProject', 'filterType', 'filterPriority', 'filterEnv', 'filterStatus']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', onChange); el.addEventListener('change', onChange); }
    });
  document.getElementById('btnApplyFilters')?.addEventListener('click', onChange);
  document.getElementById('btnClearFilters')?.addEventListener('click', () => {
    ['filterSearch', 'filterProject', 'filterType', 'filterPriority', 'filterEnv', 'filterStatus']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    onChange();
  });
}

async function loadProjectsIntoSelect(selectId) {
  const map = {};
  try {
    const d = await fetch(`${API_BASE}/projects`).then(r => r.json());
    if (d.success) {
      const sel = document.getElementById(selectId);
      d.projects.forEach(p => {
        map[p.id] = p.name;
        if (sel) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); }
      });
    }
  } catch { }
  return map;
}

function showSkeletons(listId, count = 3) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton-box" style="width:38px;height:38px;border-radius:9px;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
        <div class="skeleton-box" style="height:14px;width:55%;"></div>
        <div class="skeleton-box" style="height:10px;width:75%;"></div>
      </div>
    </div>`).join('');
}

function renderScopeBanner(bannerId, user, scopeKey) {
  const scopeConfig = {
    own_drafts: { cls: 'scope-own', icon: '👤', label: 'Own Drafts Only' },
    own: { cls: 'scope-own', icon: '👤', label: 'Own Test Cases' },
    team: { cls: 'scope-team', icon: '👥', label: 'Team Test Cases' },
    project: { cls: 'scope-project', icon: '📁', label: 'Project Scope' },
    department: { cls: 'scope-dept', icon: '🏢', label: 'Department Scope' },
    multi_project: { cls: 'scope-dept', icon: '📂', label: 'Multiple Projects' },
    organization: { cls: 'scope-org', icon: '🌐', label: 'Organization-wide' },
  };
  const sc = scopeConfig[scopeKey] || scopeConfig.own;
  const banner = document.getElementById(bannerId);
  if (banner) {
    banner.className = `scope-banner ${sc.cls}`;
    banner.innerHTML = `<span class="scope-banner-icon">${sc.icon}</span>\n      <div><strong>${sc.label}</strong> — You can edit test cases within this scope as <strong>${user.position}</strong>.</div>`;
  }
}
