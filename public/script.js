/**
 * DataOps Forge — script.js
 * Handles: login, registration (with password strength + confirm),
 *          test case creation, test case read (RBAC-scoped), filters
 */

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

/** Returns { passed: bool, strength: 0-5, failedRules: [...] } */
function validatePassword(value) {
  const results = PWD_RULES.map(r => ({ ...r, passed: r.test(value) }));
  const strength = results.filter(r => r.passed).length;
  return {
    passed: strength === PWD_RULES.length,
    strength,
    results
  };
}

/** Update the live rule checklist + strength bar in the DOM */
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

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// TEST CASE VALIDATION RULES
// ═══════════════════════════════════════════════════════════

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

// Performance fields requiring numeric validation
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

/** Wire nav bar user info (shared by create_test + read_test) */
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

// ═══════════════════════════════════════════════════════════
// LOGIN PAGE  (index.html)
// ═══════════════════════════════════════════════════════════

function initLoginPage() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const hintEmail = document.getElementById('hint-email');
  const hintPassword = document.getElementById('hint-password');
  const btnLogin = document.getElementById('btnLogin');
  const btnSignUp = document.getElementById('btnSignUp');

  if (!emailInput) return;

  emailInput.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) setInputState(emailInput, hintEmail, 'error', 'Email cannot be empty.');
    else if (!isValidEmail(v)) setInputState(emailInput, hintEmail, 'error', 'Enter a valid email address.');
    else setInputState(emailInput, hintEmail, 'success');
  });
  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error')) setInputState(emailInput, hintEmail, 'neutral');
  });

  passwordInput.addEventListener('blur', () => {
    if (!passwordInput.value) setInputState(passwordInput, hintPassword, 'error', 'Password cannot be empty.');
    else setInputState(passwordInput, hintPassword, 'success');
  });
  passwordInput.addEventListener('input', () => {
    if (passwordInput.classList.contains('input-error')) setInputState(passwordInput, hintPassword, 'neutral');
  });

  btnSignUp?.addEventListener('click', () => { window.location.href = 'register.html'; });

  btnLogin?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let hasError = false;
    if (!email) { setInputState(emailInput, hintEmail, 'error', 'Email cannot be empty.'); hasError = true; }
    else if (!isValidEmail(email)) { setInputState(emailInput, hintEmail, 'error', 'Enter a valid email address.'); hasError = true; }
    if (!password) { setInputState(passwordInput, hintPassword, 'error', 'Password cannot be empty.'); hasError = true; }
    if (hasError) return;

    setLoading(btnLogin, true);
    try {
      const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('forge_user', JSON.stringify(data.user));
        showToast('✓ Authenticated — redirecting…', 'success');
        setTimeout(() => { window.location.href = 'test.html'; }, 800);
      } else {
        setLoading(btnLogin, false, 'Login');
        document.getElementById('modalMessage').textContent = data.message || 'Invalid credentials.';
        openModal('errorModal');
      }
    } catch {
      setLoading(btnLogin, false, 'Login');
      showToast('⚠ Server unreachable. Is the server running?', 'error');
    }
  });

  [emailInput, passwordInput].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); }));
  document.getElementById('modalClose')?.addEventListener('click', () => closeModal('errorModal'));
  document.getElementById('modalSignUp')?.addEventListener('click', () => { window.location.href = 'register.html'; });
  document.getElementById('errorModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('errorModal'); });
}

// ═══════════════════════════════════════════════════════════
// REGISTER PAGE  (register.html)
// ═══════════════════════════════════════════════════════════

function buildPermissionBadge(position) {
  const p = PERMISSIONS[position];
  const pd = PERMISSION_DESCRIPTIONS[position];
  const dd = DELETE_DESCRIPTIONS[position];
  if (!p) return '';
  const appIcon = p.approve === true ? '✅' : p.approve === 'review_only' ? '⚠️' : '❌';
  const appCls = p.approve === true ? 'pb-allowed' : p.approve === 'review_only' ? 'pb-partial' : 'pb-denied';
  return `<div class="permission-badge" id="permissionBadge">
    <span class="pb-title">${position} — Permissions</span>
    <div class="pb-row"><span class="pb-icon">✅</span><span class="pb-label">Create:</span><span class="pb-allowed">All Test Cases</span></div>
    <div class="pb-row"><span class="pb-icon">👁️</span><span class="pb-label">Read:</span><span class="pb-allowed">${pd.read}</span></div>
    <div class="pb-row"><span class="pb-icon">✏️</span><span class="pb-label">Update:</span><span class="pb-allowed">${pd.update}</span></div>
    <div class="pb-row"><span class="pb-icon">${dd.icon}</span><span class="pb-label">Delete:</span><span class="${dd.cls}">${dd.label}</span></div>
    <div class="pb-row"><span class="pb-icon">${appIcon}</span><span class="pb-label">Approve:</span><span class="${appCls}">${p.approve === true ? 'Yes' : p.approve === 'review_only' ? 'Review Only' : 'No'}</span></div>
    ${p.additional.length ? `<div class="pb-row" style="margin-top:3px;"><span class="pb-icon">⭐</span><span class="pb-label">Extras:</span><span class="pb-allowed">${p.additional.join(', ')}</span></div>` : ''}
  </div>`;
}

function initRegisterPage() {
  const nameInput = document.getElementById('reg-name');
  const positionSel = document.getElementById('reg-position');
  const empIdInput = document.getElementById('reg-empid');
  const emailInput = document.getElementById('reg-email');
  const pwdInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm-password');
  const btnRegister = document.getElementById('btnRegister');
  const togglePwd = document.getElementById('togglePwd');
  const toggleConfirm = document.getElementById('toggleConfirmPwd');

  if (!nameInput) return;

  const hints = {
    name: document.getElementById('hint-reg-name'),
    pos: document.getElementById('hint-reg-position'),
    empid: document.getElementById('hint-reg-empid'),
    email: document.getElementById('hint-reg-email'),
    pwd: document.getElementById('hint-reg-password'),
    confirm: document.getElementById('hint-reg-confirm-password'),
  };

  // ── Show/hide password toggles ────────────────────────────
  function toggleVisibility(inputEl, eyeEl) {
    const show = inputEl.type === 'password';
    inputEl.type = show ? 'text' : 'password';
    eyeEl.textContent = show ? '🙈' : '👁';
  }
  togglePwd?.addEventListener('click', () => toggleVisibility(pwdInput, document.getElementById('eyePwd')));
  toggleConfirm?.addEventListener('click', () => toggleVisibility(confirmInput, document.getElementById('eyeConfirm')));

  // ── Live password strength ────────────────────────────────
  pwdInput.addEventListener('input', () => {
    updatePasswordUI(pwdInput.value);
    // Re-check confirm match if already typed
    if (confirmInput.value) checkConfirmMatch();
    if (pwdInput.classList.contains('input-error')) {
      pwdInput.classList.remove('input-error');
      hints.pwd.classList.remove('visible');
    }
  });

  pwdInput.addEventListener('blur', () => {
    const { passed } = validatePassword(pwdInput.value);
    if (!pwdInput.value) setInputState(pwdInput, hints.pwd, 'error', 'Password cannot be empty.');
    else if (!passed) setInputState(pwdInput, hints.pwd, 'error', 'Password does not meet all requirements.');
    else setInputState(pwdInput, hints.pwd, 'success');
  });

  // ── Confirm password ──────────────────────────────────────
  function checkConfirmMatch() {
    if (!confirmInput.value) {
      setInputState(confirmInput, hints.confirm, 'neutral');
      return false;
    }
    if (confirmInput.value !== pwdInput.value) {
      setInputState(confirmInput, hints.confirm, 'error', 'Passwords do not match.');
      return false;
    }
    setInputState(confirmInput, hints.confirm, 'success');
    return true;
  }

  confirmInput.addEventListener('input', checkConfirmMatch);
  confirmInput.addEventListener('blur', () => {
    if (!confirmInput.value) setInputState(confirmInput, hints.confirm, 'error', 'Please re-enter your password.');
    else checkConfirmMatch();
  });

  // ── Position select → permission badge ───────────────────
  positionSel.addEventListener('change', () => {
    const val = positionSel.value;
    if (val) {
      setInputState(positionSel, hints.pos, 'success');
      const existing = document.getElementById('permissionBadge');
      if (existing) existing.outerHTML = buildPermissionBadge(val);
      else positionSel.closest('.form-group').insertAdjacentHTML('beforeend', buildPermissionBadge(val));
      document.getElementById('permissionBadge').style.display = 'block';
    } else {
      setInputState(positionSel, hints.pos, 'neutral');
      const ex = document.getElementById('permissionBadge');
      if (ex) ex.style.display = 'none';
    }
  });

  // ── Simple blur validators ────────────────────────────────
  nameInput.addEventListener('blur', () => {
    if (!nameInput.value.trim()) setInputState(nameInput, hints.name, 'error', 'Name cannot be empty.');
    else setInputState(nameInput, hints.name, 'success');
  });
  nameInput.addEventListener('input', () => { if (nameInput.classList.contains('input-error')) { nameInput.classList.remove('input-error'); hints.name.classList.remove('visible'); } });

  empIdInput.addEventListener('blur', () => {
    if (!empIdInput.value.trim()) setInputState(empIdInput, hints.empid, 'error', 'Employee ID cannot be empty.');
    else setInputState(empIdInput, hints.empid, 'success');
  });
  empIdInput.addEventListener('input', () => { if (empIdInput.classList.contains('input-error')) { empIdInput.classList.remove('input-error'); hints.empid.classList.remove('visible'); } });

  emailInput.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) setInputState(emailInput, hints.email, 'error', 'Email cannot be empty.');
    else if (!isValidEmail(v)) setInputState(emailInput, hints.email, 'error', 'Enter a valid email address.');
    else setInputState(emailInput, hints.email, 'success');
  });
  emailInput.addEventListener('input', () => { if (emailInput.classList.contains('input-error')) { emailInput.classList.remove('input-error'); hints.email.classList.remove('visible'); } });

  document.getElementById('btnBack')?.addEventListener('click', () => { window.location.href = 'index.html'; });

  // ── Register submit ───────────────────────────────────────
  btnRegister.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const position = positionSel.value;
    const employeeId = empIdInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwdInput.value;
    const confirm = confirmInput.value;
    let hasError = false;

    if (!name) { setInputState(nameInput, hints.name, 'error', 'Name cannot be empty.'); hasError = true; }
    if (!position) { setInputState(positionSel, hints.pos, 'error', 'Please select a position.'); hasError = true; }
    if (!employeeId) { setInputState(empIdInput, hints.empid, 'error', 'Employee ID cannot be empty.'); hasError = true; }
    if (!email) { setInputState(emailInput, hints.email, 'error', 'Email cannot be empty.'); hasError = true; }
    else if (!isValidEmail(email)) { setInputState(emailInput, hints.email, 'error', 'Enter a valid email address.'); hasError = true; }

    if (!password) {
      setInputState(pwdInput, hints.pwd, 'error', 'Password cannot be empty.'); hasError = true;
    } else {
      const { passed } = validatePassword(password);
      if (!passed) { setInputState(pwdInput, hints.pwd, 'error', 'Password does not meet all requirements.'); hasError = true; }
    }

    if (!confirm) {
      setInputState(confirmInput, hints.confirm, 'error', 'Please re-enter your password.'); hasError = true;
    } else if (confirm !== password) {
      setInputState(confirmInput, hints.confirm, 'error', 'Passwords do not match.'); hasError = true;
    }

    if (hasError) { showToast('⚠ Please fix the highlighted fields.', 'error'); return; }

    setLoading(btnRegister, true);
    try {
      const res = await fetch(`${API_BASE}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, position, employeeId, email, password }) });
      const data = await res.json();
      setLoading(btnRegister, false, 'Register');
      if (data.success) {
        openModal('successModal');
      } else {
        if (data.message.includes('Employee ID')) setInputState(empIdInput, hints.empid, 'error', 'This Employee ID is already taken.');
        else if (data.message.includes('Email')) setInputState(emailInput, hints.email, 'error', 'This email is already registered.');
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btnRegister, false, 'Register');
      showToast('⚠ Server unreachable. Is the server running?', 'error');
    }
  });

  confirmInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnRegister.click(); });
  document.getElementById('successGoHome')?.addEventListener('click', () => { window.location.href = 'index.html'; });
}

// ═══════════════════════════════════════════════════════════
// CREATE TEST CASE PAGE  (create_test.html)
// ═══════════════════════════════════════════════════════════

function initCreateTestPage() {
  if (!document.getElementById('typeSelector')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }

  wireNavBar(user);

  if (!canCreate(user.position)) {
    document.getElementById('permDeniedBanner').style.display = 'flex';
    document.getElementById('formCard').style.cssText = 'opacity:0.4;pointer-events:none;';
    return;
  }

  const tcId = generateUUID();
  const now = nowISO();
  document.getElementById('displayTcId').textContent = tcId;
  document.getElementById('metaTcId').textContent = tcId;
  document.getElementById('metaCreatedBy').textContent = user.employeeId || user.name;
  document.getElementById('metaTimestamp').textContent = fmtDate(now);

  // Load projects
  const projectSelect = document.getElementById('tc-project');
  fetch(`${API_BASE}/projects`)
    .then(r => r.json())
    .then(data => {
      if (data.success) data.projects.forEach(p => {
        const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; projectSelect.appendChild(o);
      });
    })
    .catch(() => {
      [{ id: 'PRJ-001', name: 'Project Alpha' }, { id: 'PRJ-002', name: 'Project Beta' }, { id: 'PRJ-003', name: 'Project Gamma' }]
        .forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; projectSelect.appendChild(o); });
    });

  // Type selector
  const typeGrid = document.getElementById('typeSelector');
  let selectedType = null;
  TESTING_TYPES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'type-card'; card.dataset.type = t.id;
    card.innerHTML = `<span class="type-card-icon">${t.icon}</span><div class="type-card-name">${t.label}</div>`;
    card.addEventListener('click', () => {
      typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedType = t.id;
      document.getElementById('hint-tc-type').style.display = 'none';
      renderDynamicFields(t.id);
    });
    typeGrid.appendChild(card);
  });

  // Tags
  const tagWrapper = document.getElementById('tagWrapper');
  const tagInput = document.getElementById('tagInput');
  const tags = [];
  function addTag(raw) {
    const v = raw.trim().replace(/,/g, '');
    if (!v || tags.includes(v)) return;
    tags.push(v);
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${v}<button class="tag-chip-remove" title="Remove">×</button>`;
    chip.querySelector('button').addEventListener('click', () => { tags.splice(tags.indexOf(v), 1); chip.remove(); });
    tagWrapper.insertBefore(chip, tagInput);
  }
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput.value); tagInput.value = ''; }
    else if (e.key === 'Backspace' && !tagInput.value && tags.length) { tags.pop(); tagWrapper.querySelector('.tag-chip:last-of-type')?.remove(); }
  });
  tagWrapper.addEventListener('click', () => tagInput.focus());

  // Dynamic fields
  function renderDynamicFields(typeId) {
    const section = document.getElementById('dynamicSection');
    const config = DYNAMIC_FIELD_CONFIGS[typeId];
    if (!config) { section.innerHTML = ''; return; }
    let html = `<div class="dynamic-section"><div class="dynamic-section-title">⚗️ ${config.label}</div>`;
    config.fields.forEach(f => {
      const req = f.required ? `<span style="color:var(--error)"> *</span>` : '';
      const hintId = `hint-dyn-${f.id}`;
      if (f.type === 'textarea') {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><textarea id="dyn-${f.id}" class="forge-textarea" placeholder="${f.placeholder}" rows="3"></textarea><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      } else if (f.type === 'select') {
        const opts = f.options.map(o => `<option value="${o}">${o}</option>`).join('');
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><div class="select-wrapper"><select id="dyn-${f.id}" class="forge-select"><option value="">— Select —</option>${opts}</select><span class="select-arrow">▾</span></div><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      } else if (f.type === 'steps') {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><div class="steps-list" id="steps-${f.id}"><div class="step-row"><span class="step-number">1.</span><input type="text" class="step-input" placeholder="${f.placeholder}" /><button class="step-remove" title="Remove">×</button></div></div><button class="add-step-btn" data-steps-id="${f.id}">＋ Add Step</button><span class="field-hint" id="${hintId}">At least one step is required.</span></div>`;
      } else {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><input type="text" id="dyn-${f.id}" class="forge-input" placeholder="${f.placeholder}" /><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      }
    });
    html += '</div>';
    section.innerHTML = html;
    section.querySelectorAll('.step-remove').forEach(btn => btn.addEventListener('click', () => removeStep(btn.closest('.step-row'))));
    section.querySelectorAll('.add-step-btn').forEach(btn => btn.addEventListener('click', () => addStep(btn.dataset.stepsId)));
  }

  function addStep(sid) {
    const list = document.getElementById(`steps-${sid}`);
    const num = list.children.length + 1;
    const row = document.createElement('div'); row.className = 'step-row';
    row.innerHTML = `<span class="step-number">${num}.</span><input type="text" class="step-input" placeholder="Step ${num}…" /><button class="step-remove" title="Remove">×</button>`;
    row.querySelector('.step-remove').addEventListener('click', () => removeStep(row));
    list.appendChild(row);
    row.querySelector('input').focus();
  }

  function removeStep(row) {
    const list = row.parentElement;
    if (list.children.length <= 1) return;
    row.remove();
    list.querySelectorAll('.step-number').forEach((n, i) => { n.textContent = `${i + 1}.`; });
  }

  function collectDynamicData() {
    if (!selectedType) return { data: {}, valid: true };
    const config = DYNAMIC_FIELD_CONFIGS[selectedType];
    const dynData = {}; let valid = true;
    config.fields.forEach(f => {
      const hintEl = document.getElementById(`hint-dyn-${f.id}`);
      if (f.type === 'steps') {
        const steps = Array.from(
          document.querySelectorAll(`#steps-${f.id} .step-input`)
        )
          .map(i => i.value.trim())
          .filter(Boolean);

        dynData[f.id] = steps;

        if (f.required && !steps.length) {
          valid = false;
        }

        // Each step must be >= 10 chars
        if (steps.some(step => !textRules(step).valid)) {
          if (hintEl) {
            hintEl.textContent = 'Each step must contain at least 10 characters.';
            hintEl.classList.add('visible');
          }
          valid = false;
        }
      }
      else {
        const el = document.getElementById(`dyn-${f.id}`);
        const val = el ? el.value.trim() : '';

        dynData[f.id] = val;

        if (val) {

          if (NUMERIC_FIELDS.includes(f.id)) {
            if (!numericRules(val).valid) {
              el.classList.add('input-error');
              if (hintEl) {
                hintEl.textContent = numericRules(val).message;
                hintEl.classList.add('visible');
              }
              valid = false;
            }
          }
          else if (!['httpMethod', 'cvssScore'].includes(f.id)) {
            if (!textRules(val).valid) {
              el.classList.add('input-error');
              if (hintEl) {
                hintEl.textContent = textRules(val).message;
                hintEl.classList.add('visible');
              }
              valid = false;
            }
          }
        }
      }
    });
    return { data: dynData, valid };
  }

  function validateCommonFields() {
    let valid = true;
    const fields = [
      { el: document.getElementById('tc-name'), hint: document.getElementById('hint-tc-name'), msg: 'Test Case Name is required.' },
      { el: document.getElementById('tc-desc'), hint: document.getElementById('hint-tc-desc'), msg: 'Description is required.' },
      { el: document.getElementById('tc-project'), hint: document.getElementById('hint-tc-project'), msg: 'Please select a project.' },
      { el: document.getElementById('tc-priority'), hint: document.getElementById('hint-tc-priority'), msg: 'Please select a priority.' },
      { el: document.getElementById('tc-env'), hint: document.getElementById('hint-tc-env'), msg: 'Please select an environment.' },
    ];
    fields.forEach(({ el, hint, msg }) => {
      if (!el.value.trim()) { setInputState(el, hint, 'error', msg); valid = false; }
      else setInputState(el, hint, 'success');
    });
    const typeHint = document.getElementById('hint-tc-type');
    if (!selectedType) { typeHint.textContent = 'Please select a testing type.'; typeHint.style.display = 'block'; typeHint.classList.add('visible'); valid = false; }
    else { typeHint.classList.remove('visible'); typeHint.style.display = 'none'; }
    const name = document.getElementById('tc-name').value.trim();
    const desc = document.getElementById('tc-desc').value.trim();

    if (!textRules(name).valid) {
      setInputState(
        document.getElementById('tc-name'),
        document.getElementById('hint-tc-name'),
        'error',
        'Test Case Name must contain at least 10 characters.'
      );
      valid = false;
    }

    if (!textRules(desc).valid) {
      setInputState(
        document.getElementById('tc-desc'),
        document.getElementById('hint-tc-desc'),
        'error',
        'Description must contain at least 10 characters.'
      );
      valid = false;
    }

    return valid;
  }

  function resetForm() {
    ['tc-name', 'tc-desc', 'tc-project', 'tc-priority', 'tc-env'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    tagInput.value = ''; tags.splice(0);
    document.getElementById('tagWrapper').querySelectorAll('.tag-chip').forEach(c => c.remove());
    typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    selectedType = null;
    document.getElementById('dynamicSection').innerHTML = '';
    document.querySelectorAll('.input-error, .input-success').forEach(el => el.classList.remove('input-error', 'input-success'));
    document.querySelectorAll('.field-hint.visible').forEach(h => h.classList.remove('visible'));
  }

  document.getElementById('btnReset').addEventListener('click', () => { if (confirm('Reset all fields?')) resetForm(); });

  document.getElementById('btnSubmit').addEventListener('click', async () => {
    const commonOk = validateCommonFields();
    const dynResult = collectDynamicData();
    if (!commonOk || !dynResult.valid) { showToast('⚠ Please fix the highlighted fields.', 'error'); return; }
    const tsNow = nowISO();
    const payload = {
      testCaseId: tcId,
      testCaseName: document.getElementById('tc-name').value.trim(),
      description: document.getElementById('tc-desc').value.trim(),
      projectId: document.getElementById('tc-project').value,
      testingType: TESTING_TYPES.find(t => t.id === selectedType)?.label || selectedType,
      testingTypeId: selectedType,
      priority: document.getElementById('tc-priority').value,
      environment: document.getElementById('tc-env').value,
      tags: [...tags],
      status: 'Draft',
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      version: 1,
      createdBy: user.employeeId || user.email,
      createdByName: user.name,
      createdTimestamp: tsNow,
      updatedTimestamp: tsNow,
      dynamicData: dynResult.data || {}
    };
    const btn = document.getElementById('btnSubmit');
    setLoading(btn, true);
    try {
      const res = await fetch(`${API_BASE}/test-cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, userPosition: user.position, employeeId: user.employeeId }) });
      const data = await res.json();
      setLoading(btn, false, '＋ Create Test Case');
      if (data.success) {
        document.getElementById('formCard').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';
        document.getElementById('spTcId').textContent = tcId;
        showToast('✅ Test case saved!', 'success');
      } else {
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btn, false, '＋ Create Test Case');
      showToast('⚠ Server unreachable. Is the server running?', 'error');
    }
  });

  document.getElementById('btnCreateAnother')?.addEventListener('click', () => window.location.reload());
}

// ═══════════════════════════════════════════════════════════
// READ TEST CASES PAGE  (read_test.html)
// ═══════════════════════════════════════════════════════════

function initReadTestPage() {
  if (!document.getElementById('tcCardList')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }
  wireNavBar(user);

  const perms = PERMISSIONS[user.position] || PERMISSIONS['Employee'];
  const scope = perms.read;

  // Show scope banner
  const scopeConfig = {
    own: { cls: 'scope-own', icon: '👤', text: `Showing <strong>your own</strong> test cases only.` },
    team: { cls: 'scope-team', icon: '👥', text: `Showing test cases from <strong>your team</strong>.` },
    project: { cls: 'scope-project', icon: '📁', text: `Showing all test cases across <strong>your projects</strong>.` },
    department: { cls: 'scope-dept', icon: '🏢', text: `Showing test cases across your <strong>department</strong>.` },
    multi_project: { cls: 'scope-dept', icon: '📂', text: `Showing test cases across <strong>multiple projects</strong>.` },
    organization: { cls: 'scope-org', icon: '🌐', text: `Showing <strong>all test cases</strong> in the organization.` },
  };
  const sc = scopeConfig[scope] || scopeConfig.own;
  const banner = document.getElementById('scopeBanner');
  if (banner) {
    banner.className = `scope-banner ${sc.cls}`;
    banner.innerHTML = `<span class="scope-banner-icon">${sc.icon}</span><div>${PERMISSION_DESCRIPTIONS[user.position]?.read || 'Own Test Cases'} — ${sc.text}</div>`;
  }

  // State
  let allTestCases = [];
  let filteredCases = [];
  let sortField = 'createdTimestamp';
  let sortDir = 'desc';
  let projectsMap = {};

  // Fetch projects for filter dropdown + name mapping
  fetch(`${API_BASE}/projects`)
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        const sel = document.getElementById('filterProject');
        d.projects.forEach(p => {
          projectsMap[p.id] = p.name;
          const o = document.createElement('option'); o.value = p.id; o.textContent = p.name;
          sel?.appendChild(o);
        });
      }
    }).catch(() => { });

  // Fetch and filter test cases
  async function loadTestCases() {
    showSkeletons();
    try {
      const params = new URLSearchParams({ userPosition: user.position, employeeId: user.employeeId });
      const res = await fetch(`${API_BASE}/test-cases?${params}`);
      const data = await res.json();
      if (data.success) {
        allTestCases = data.testCases;
        applyFiltersAndRender();
      } else {
        showError(data.message);
      }
    } catch {
      showError('Could not connect to server. Make sure it is running on port 3000.');
    }
  }

  // Filter + sort logic
  function applyFiltersAndRender() {
    const search = document.getElementById('filterSearch')?.value.trim().toLowerCase() || '';
    const project = document.getElementById('filterProject')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    const priority = document.getElementById('filterPriority')?.value || '';
    const env = document.getElementById('filterEnv')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const dateFrom = document.getElementById('filterDateFrom')?.value || '';
    const dateTo = document.getElementById('filterDateTo')?.value || '';

    filteredCases = allTestCases.filter(tc => {
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
        if (status === 'Pending' && !(tc.status === 'Pending Review')) return false;
      }
      if (dateFrom) { const d = new Date(tc.createdTimestamp); if (d < new Date(dateFrom)) return false; }
      if (dateTo) { const d = new Date(tc.createdTimestamp); const to = new Date(dateTo); to.setHours(23, 59, 59); if (d > to) return false; }
      return true;
    });

    // Sort
    filteredCases.sort((a, b) => {
      let va = a[sortField] || '', vb = b[sortField] || '';
      if (sortField === 'createdTimestamp' || sortField === 'updatedTimestamp') {
        va = new Date(va); vb = new Date(vb);
      } else {
        va = va.toString().toLowerCase(); vb = vb.toString().toLowerCase();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    updateResultsCount();
    renderCards();
  }

  function updateResultsCount() {
    const el = document.getElementById('resultsCount');
    if (el) el.innerHTML = `Showing <strong>${filteredCases.length}</strong> of <strong>${allTestCases.length}</strong> test cases`;
  }

  // Skeletons while loading
  function showSkeletons() {
    const list = document.getElementById('tcCardList');
    list.innerHTML = [1, 2, 3].map(() => `
      <div class="skeleton-card">
        <div class="skeleton-box" style="width:38px;height:38px;border-radius:9px;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="skeleton-box" style="height:14px;width:55%;"></div>
          <div class="skeleton-box" style="height:10px;width:75%;"></div>
        </div>
      </div>`).join('');
  }

  function showError(msg) {
    document.getElementById('tcCardList').innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <div class="empty-state-title">Error Loading Test Cases</div>
        <div class="empty-state-sub">${msg}</div>
      </div>`;
  }

  // Render the card list
  function renderCards() {
    const list = document.getElementById('tcCardList');
    if (!filteredCases.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          <div class="empty-state-title">No Test Cases Found</div>
          <div class="empty-state-sub">
            ${allTestCases.length === 0
          ? 'No test cases have been created yet.<br/>Go to <a href="create_test.html" style="color:var(--purple-accent)">Create Test Case</a> to add one.'
          : 'No test cases match the current filters.<br/>Try adjusting or clearing your search criteria.'}
          </div>
          ${allTestCases.length > 0 ? `<button class="btn btn-secondary btn-sm" id="btnClearFiltersEmpty">Clear All Filters</button>` : ''}
        </div>`;
      document.getElementById('btnClearFiltersEmpty')?.addEventListener('click', clearFilters);
      return;
    }
    list.innerHTML = filteredCases.map(tc => buildTcCard(tc)).join('');

    // Wire expand toggles
    list.querySelectorAll('.tc-card-head').forEach(head => {
      head.addEventListener('click', () => {
        const card = head.closest('.tc-card');
        const btn = head.querySelector('.tc-expand-btn');
        card.classList.toggle('expanded');
        btn.classList.toggle('open');
      });
    });
  }

  // Build a single test case card HTML
  function buildTcCard(tc) {
    const icon = typeIcon(tc.testingTypeId || tc.testingType);
    const priorityCls = `tc-pill-${(tc.priority || 'low').toLowerCase()}`;
    const statusCls = tc.isApproved ? 'tc-pill-approved' : (tc.status === 'Draft' ? 'tc-pill-draft' : 'tc-pill-pending');
    const statusLabel = tc.isApproved ? '✓ Approved' : tc.status || 'Draft';
    const projName = projectsMap[tc.projectId] || tc.projectId || '—';
    const tagsHtml = (tc.tags || []).length
      ? `<div class="tc-tags">${tc.tags.map(t => `<span class="tc-tag">${t}</span>`).join('')}</div>` : '—';

    // Build dynamic data section
    const dynConfig = DYNAMIC_FIELD_CONFIGS[tc.testingTypeId];
    let dynHtml = '';
    if (dynConfig && tc.dynamicData) {
      const fields = dynConfig.fields;
      dynHtml = `<div class="tc-dynamic-section">
        <div class="tc-dynamic-title">⚗️ ${dynConfig.label}</div>
        <div class="tc-detail-grid">`;
      fields.forEach(f => {
        const val = tc.dynamicData[f.id];
        if (!val || (Array.isArray(val) && !val.length)) return;
        if (f.type === 'steps' && Array.isArray(val)) {
          dynHtml += `<div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">${f.label}</div>
            <ol class="tc-steps-list">${val.map((s, i) => `<li><span class="step-n">${i + 1}.</span>${s}</li>`).join('')}</ol>
          </div>`;
        } else if (f.type === 'textarea') {
          dynHtml += `<div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">${f.label}</div>
            <div class="tc-detail-value mono">${escHtml(val)}</div>
          </div>`;
        } else {
          dynHtml += `<div class="tc-detail-field">
            <div class="tc-detail-label">${f.label}</div>
            <div class="tc-detail-value">${escHtml(String(val))}</div>
          </div>`;
        }
      });
      dynHtml += `</div></div>`;
    }

    const approvalBanner = tc.isApproved
      ? `<div class="tc-approved-banner">✅ Approved${tc.approvedBy ? ' by ' + tc.approvedBy : ''}${tc.approvedAt ? ' · ' + fmtDateShort(tc.approvedAt) : ''}</div>`
      : `<div class="tc-draft-banner">📝 ${tc.status || 'Draft'} — Pending Approval</div>`;

    return `
    <div class="tc-card" data-id="${tc.testCaseId}">
      <div class="tc-card-head">
        <div class="tc-type-badge">${icon}</div>
        <div class="tc-card-main">
          <div class="tc-card-name">${escHtml(tc.testCaseName)}</div>
          <div class="tc-card-meta">
            <span class="tc-pill tc-pill-id">${tc.testCaseId}</span>
            <span class="tc-pill ${statusCls}">${statusLabel}</span>
            <span class="tc-pill ${priorityCls}">${tc.priority || '—'}</span>
            <span class="tc-pill tc-pill-env">${tc.environment || '—'}</span>
            <span class="tc-pill tc-pill-type">${tc.testingType || '—'}</span>
          </div>
        </div>
        <div class="tc-card-right">
          <div class="tc-date">
            <div>${fmtDateShort(tc.createdTimestamp)}</div>
            <div style="color:var(--gray-mid);font-size:9px;">by ${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <button class="tc-expand-btn" title="Expand">▾</button>
        </div>
      </div>
      <div class="tc-card-body">
        ${approvalBanner}
        <div class="tc-detail-grid">
          <div class="tc-detail-field">
            <div class="tc-detail-label">Test Case ID</div>
            <div class="tc-detail-value mono">${tc.testCaseId}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Project</div>
            <div class="tc-detail-value">${escHtml(projName)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Testing Type</div>
            <div class="tc-detail-value">${icon} ${escHtml(tc.testingType || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Priority</div>
            <div class="tc-detail-value">${escHtml(tc.priority || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Environment</div>
            <div class="tc-detail-value">${escHtml(tc.environment || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Status</div>
            <div class="tc-detail-value">${statusLabel}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Version</div>
            <div class="tc-detail-value">v${tc.version || 1}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Created By</div>
            <div class="tc-detail-value">${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Created At</div>
            <div class="tc-detail-value">${fmtDate(tc.createdTimestamp)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Last Updated</div>
            <div class="tc-detail-value">${fmtDate(tc.updatedTimestamp)}</div>
          </div>
          <div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">Description</div>
            <div class="tc-detail-value">${escHtml(tc.description || '—')}</div>
          </div>
          <div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">Tags</div>
            <div class="tc-detail-value">${tagsHtml}</div>
          </div>
          ${tc.reviewComment ? `<div class="tc-detail-field" style="grid-column:1/-1;border-top:1px solid var(--gray-light);padding-top:12px;margin-top:12px;">
            <div class="tc-detail-label">📝 Review Comment</div>
            <div class="tc-detail-value" style="background:var(--gray-light);padding:12px;border-radius:6px;">${escHtml(tc.reviewComment)}</div>
            <div style="font-size:9px;color:var(--gray-mid);margin-top:8px;">By ${escHtml(tc.reviewedBy || '—')} · ${fmtDate(tc.reviewedAt)}</div>
          </div>` : ''}
        </div>
        ${dynHtml}
      </div>
    </div>`;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Wire filter controls ──────────────────────────────────
  ['filterSearch', 'filterProject', 'filterType', 'filterPriority', 'filterEnv', 'filterStatus', 'filterDateFrom', 'filterDateTo']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', applyFiltersAndRender);
      if (el) el.addEventListener('change', applyFiltersAndRender);
    });

  function clearFilters() {
    ['filterSearch', 'filterProject', 'filterType', 'filterPriority', 'filterEnv', 'filterStatus', 'filterDateFrom', 'filterDateTo']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    applyFiltersAndRender();
  }

  document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);
  document.getElementById('btnApplyFilters')?.addEventListener('click', applyFiltersAndRender);

  // ── Sort buttons ──────────────────────────────────────────
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      if (sortField === field) {
        sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        sortField = field; sortDir = 'desc';
      }
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.textContent = btn.dataset.label + (sortDir === 'asc' ? ' ↑' : ' ↓');
      applyFiltersAndRender();
    });
  });

  loadTestCases();
}

// ═══════════════════════════════════════════════════════════
// SHARED — filter/sort/card infrastructure reused across
//          read, update, delete pages
// ═══════════════════════════════════════════════════════════

/**
 * Builds the standard escHtml helper — used by all card renderers.
 */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Shared filter/sort engine.
 * allCases      — full dataset
 * projectsMap   — { id → name }
 * Returns sorted, filtered subset.
 */
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

/** Wire sort buttons on a page. onSort(field, dir) called after each change. */
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

/** Sort a test-case array in place. */
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

/** Wire filter inputs to a callback. */
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

/** Load projects into a <select> and return a projectsMap promise. */
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

/** Shared skeleton loader */
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

/** Build the scope banner */
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
    banner.innerHTML = `<span class="scope-banner-icon">${sc.icon}</span>
      <div><strong>${sc.label}</strong> — You can edit test cases within this scope as <strong>${user.position}</strong>.</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// UPDATE TEST CASES PAGE  (update_test.html)
// ═══════════════════════════════════════════════════════════

function initUpdateTestPage() {
  if (!document.getElementById('tcCardList') || !window.location.pathname.includes('update_test')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }
  wireNavBar(user);

  const perms = PERMISSIONS[user.position] || PERMISSIONS['Employee'];
  const scope = perms.update;
  renderScopeBanner('scopeBanner', user, scope);

  let allTestCases = [];
  let projectsMap = {};
  let sortField = 'createdTimestamp';
  let sortDir = 'desc';
  let activeEditId = null;   // which card is currently open in edit mode
  let hasUnsaved = false;  // dirty flag
  let pendingOpenId = null;   // card waiting to open after discard confirm

  // Load projects
  loadProjectsIntoSelect('filterProject').then(m => { projectsMap = m; });

  // ── Fetch test cases ──────────────────────────────────────
  async function loadTestCases() {
    showSkeletons('tcCardList');
    try {
      const params = new URLSearchParams({ userPosition: user.position, employeeId: user.employeeId });
      const res = await fetch(`${API_BASE}/test-cases?${params}`);
      const data = await res.json();
      if (data.success) { allTestCases = data.testCases; render(); }
      else showListError(data.message);
    } catch { showListError('Could not connect to server. Make sure it is running on port 3000.'); }
  }

  function showListError(msg) {
    document.getElementById('tcCardList').innerHTML = `
      <div class="empty-state"><span class="empty-state-icon">⚠️</span>
        <div class="empty-state-title">Error Loading Test Cases</div>
        <div class="empty-state-sub">${msg}</div></div>`;
  }

  // ── Render all cards ──────────────────────────────────────
  function render() {
    const filtered = sortCases(applyFilters(allTestCases, projectsMap), sortField, sortDir);
    const list = document.getElementById('tcCardList');
    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${allTestCases.length}</strong> test cases`;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🔍</span>
        <div class="empty-state-title">No Test Cases Found</div>
        <div class="empty-state-sub">${allTestCases.length === 0
          ? 'No test cases yet. <a href="create_test.html" style="color:var(--purple-accent)">Create one first.</a>'
          : 'No results match your filters.'}</div></div>`;
      return;
    }

    list.innerHTML = filtered.map(tc => buildUpdateCard(tc)).join('');

    // Wire all expand/edit buttons
    list.querySelectorAll('.tc-card-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('button:not(.tc-expand-btn)')) return;
        toggleEditCard(head.closest('.tc-card').dataset.id);
      });
    });
    list.querySelectorAll('.btn-open-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); toggleEditCard(btn.dataset.id); });
    });
    list.querySelectorAll('.btn-save-update').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); saveUpdate(btn.dataset.id); });
    });
    list.querySelectorAll('.btn-cancel-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); cancelEdit(btn.dataset.id); });
    });
  }

  // ── Determine if user can edit a specific test case ───────
  function canEditThisTc(tc) {
    if (scope === 'own_drafts') return tc.createdBy === user.employeeId && tc.status === 'Draft' && !tc.isApproved;
    if (scope === 'team') {
      const lowerTiers = Object.entries(PERMISSIONS).filter(([, p]) => p.tier <= perms.tier).map(([pos]) => pos);
      return (lowerTiers.includes(tc.creatorPosition) || tc.createdBy === user.employeeId) && !tc.isApproved;
    }
    if (scope === 'organization') return true; // Director
    return !tc.isApproved; // project/department/multi
  }

  function editBlockedReason(tc) {
    if (tc.isApproved) return 'This test case has been approved and is locked from editing.';
    if (scope === 'own_drafts') {
      if (tc.createdBy !== user.employeeId) return 'You can only edit your own test cases.';
      if (tc.status !== 'Draft') return 'You can only edit Draft test cases.';
    }
    return null;
  }

  // ── Build a single update card ────────────────────────────
  function buildUpdateCard(tc) {
    const icon = typeIcon(tc.testingTypeId || tc.testingType);
    const priCls = `tc-pill-${(tc.priority || 'low').toLowerCase()}`;
    const statusCls = tc.isApproved ? 'tc-pill-approved' : (tc.status === 'Draft' ? 'tc-pill-draft' : 'tc-pill-pending');
    const statusLabel = tc.isApproved ? '✓ Approved' : (tc.status || 'Draft');
    const projName = projectsMap[tc.projectId] || tc.projectId || '—';
    const canEdit = canEditThisTc(tc);
    const blocked = editBlockedReason(tc);
    const isOpen = activeEditId === tc.testCaseId;

    // Build project options
    const projOpts = Object.entries(projectsMap)
      .map(([id, name]) => `<option value="${id}" ${tc.projectId === id ? 'selected' : ''}>${name}</option>`).join('');

    // Build dynamic fields pre-filled
    const dynConfig = DYNAMIC_FIELD_CONFIGS[tc.testingTypeId];
    let dynHtml = '';
    if (dynConfig) {
      dynHtml = `<div class="dynamic-section" style="margin-top:0;">
        <div class="dynamic-section-title">⚗️ ${dynConfig.label}</div>`;
      dynConfig.fields.forEach(f => {
        const req = f.required ? `<span style="color:var(--error)"> *</span>` : '';
        const val = tc.dynamicData?.[f.id] || '';
        
        if (f.type === 'textarea') {
          dynHtml += `<div class="form-group"><label>${f.label}${req}</label>
            <textarea id="upd-dyn-${tc.testCaseId}-${f.id}" class="forge-textarea" rows="3"
              data-original="${escHtml(String(val))}">${escHtml(String(val))}</textarea>
              <span class="field-hint" id="upd-hint-${tc.testCaseId}-${f.id}"> </span></div>`;
        } 
        
        else if (f.type === 'select') {
          const opts = f.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('');
          dynHtml += `<div class="form-group"><label>${f.label}${req}</label>
            <div class="select-wrapper">
              <select id="upd-dyn-${tc.testCaseId}-${f.id}" class="forge-select" data-original="${escHtml(val)}">
                <option value="">— Select —</option>${opts}</select>
              <span class="field-hint" id="upd-hint-${tc.testCaseId}-${f.id}"> </span>  
              <span class="select-arrow">▾</span></div></div>`;
        } 
        
        else if (f.type === 'steps') {
          const steps = Array.isArray(val) ? val : [];
          const stepsHtml = steps.length
            ? steps.map((s, i) => `<div class="step-row">
                <span class="step-number">${i + 1}.</span>
                <input type="text" class="step-input" value="${escHtml(s)}" placeholder="Step ${i + 1}…" />
                <button class="step-remove" title="Remove">×</button></div>`).join('')
            : `<div class="step-row"><span class="step-number">1.</span>
               <input type="text" class="step-input" placeholder="${f.placeholder}" />
               <button class="step-remove" title="Remove">×</button></div>`;
          dynHtml += `<div class="form-group"><label>${f.label}${req}</label>
            <div class="steps-list" id="upd-steps-${tc.testCaseId}-${f.id}">${stepsHtml}</div>
            <button class="add-step-btn" data-steps-id="upd-steps-${tc.testCaseId}-${f.id}">＋ Add Step</button>
            <span class="field-hint" id="upd-hint-${tc.testCaseId}-${f.id}"> </span>
            </div>`;
        } 
        
        else {
          dynHtml += `<div class="form-group"><label>${f.label}${req}</label>
            <input type="text" id="upd-dyn-${tc.testCaseId}-${f.id}" class="forge-input"
              value="${escHtml(String(val))}" data-original="${escHtml(String(val))}" />
            <span class="field-hint" id="upd-hint-${tc.testCaseId}-${f.id}"> </span>
          </div>`;
        }
      });
      dynHtml += '</div>';
    }

    const editSection = canEdit ? `
      <div class="tc-card-body" style="${isOpen ? '' : 'display:none'}">

        ${tc.isApproved ? `<div class="approved-lock-banner"><span class="alb-icon">🔒</span>
          <div class="alb-text"><strong>Approved — Locked</strong>This test case is approved and cannot be edited.</div></div>` : ''}

        ${tc.reviewComment ? `<div style="background:#f0f4ff;padding:12px;border-radius:6px;margin-bottom:16px;border-left:4px solid var(--purple-accent);">
          <div style="font-weight:600;color:var(--purple-accent);margin-bottom:8px;">📝 Review Comment</div>
          <div style="color:var(--text-primary);margin-bottom:8px;">${escHtml(tc.reviewComment)}</div>
          <div style="font-size:9px;color:var(--gray-mid);">By ${escHtml(tc.reviewedBy || '—')} · ${fmtDate(tc.reviewedAt)}</div>
        </div>` : ''}

        <!-- Version strip -->
        <div class="version-strip">
          <span class="vs-label">Currently</span>
          <span class="vs-val">v${tc.version || 1}</span>
          <span class="vs-sep">→</span>
          <span class="vs-label">Will save as</span>
          <span class="vs-val">v${(tc.version || 1) + 1}</span>
          <span class="vs-date">Last updated: ${fmtDate(tc.updatedTimestamp)}</span>
        </div>

        <!-- Approved lock notice or full edit form -->
        ${tc.isApproved ? '' : `

        <!-- Core fields -->
        <div class="form-section-heading"><span class="fsh-icon">📋</span>Core Information</div>
        <div class="form-group">
          <label>Test Case Name <span style="color:var(--error)">*</span></label>
          <input type="text" id="upd-name-${tc.testCaseId}" class="forge-input"
            value="${escHtml(tc.testCaseName)}" data-original="${escHtml(tc.testCaseName)}" />
          <span class="field-hint" id="upd-hint-name-${tc.testCaseId}">Name cannot be empty.</span>
        </div>
        <div class="form-group">
          <label>Description <span style="color:var(--error)">*</span></label>
          <textarea id="upd-desc-${tc.testCaseId}" class="forge-textarea" rows="3"
            data-original="${escHtml(tc.description)}">${escHtml(tc.description)}</textarea>
          <span class="field-hint" id="upd-hint-desc-${tc.testCaseId}">Description cannot be empty.</span>
        </div>

        <div class="form-section-heading" style="margin-top:16px;"><span class="fsh-icon">🏷️</span>Classification</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Project <span style="color:var(--error)">*</span></label>
            <div class="select-wrapper">
              <select id="upd-project-${tc.testCaseId}" class="forge-select" data-original="${tc.projectId}">
                <option value="">— Select Project —</option>${projOpts}
              </select><span class="select-arrow">▾</span></div>
          </div>
          <div class="form-group">
            <label>Priority <span style="color:var(--error)">*</span></label>
            <div class="select-wrapper">
              <select id="upd-priority-${tc.testCaseId}" class="forge-select" data-original="${tc.priority}">
                <option value="">— Select —</option>
                <option value="Critical" ${tc.priority === 'Critical' ? 'selected' : ''}>🔴 Critical</option>
                <option value="High"     ${tc.priority === 'High' ? 'selected' : ''}>🟠 High</option>
                <option value="Medium"   ${tc.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
                <option value="Low"      ${tc.priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
              </select><span class="select-arrow">▾</span></div>
          </div>
        </div>
        <div class="form-group">
          <label>Environment <span style="color:var(--error)">*</span></label>
          <div class="select-wrapper">
            <select id="upd-env-${tc.testCaseId}" class="forge-select" data-original="${tc.environment}">
              <option value="">— Select —</option>
              <option value="Dev"       ${tc.environment === 'Dev' ? 'selected' : ''}>🛠️ Dev</option>
              <option value="QA"        ${tc.environment === 'QA' ? 'selected' : ''}>🧪 QA</option>
              <option value="UAT"       ${tc.environment === 'UAT' ? 'selected' : ''}>🔍 UAT</option>
              <option value="Prod-like" ${tc.environment === 'Prod-like' ? 'selected' : ''}>🚀 Prod-like</option>
            </select><span class="select-arrow">▾</span></div>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <div class="tag-input-wrapper" id="upd-tagwrap-${tc.testCaseId}">
            ${(tc.tags || []).map(t => `<span class="tag-chip">${escHtml(t)}<button class="tag-chip-remove" title="Remove">×</button></span>`).join('')}
            <input type="text" class="tag-text-input upd-tag-input" data-tcid="${tc.testCaseId}" placeholder="Add tag + Enter…" />
          </div>
          <div class="tag-hint">Press Enter or comma to add · Click × to remove</div>
        </div>

        ${dynHtml}

        `}

        <!-- Action bar -->
        <div class="form-action-bar" style="border-top:1px solid var(--gray-light);margin-top:16px;">
          <button class="btn btn-secondary btn-cancel-edit" data-id="${tc.testCaseId}">✕ Cancel</button>
          ${!tc.isApproved ? `<button class="btn btn-primary btn-save-update" data-id="${tc.testCaseId}">💾 Save Changes</button>` : ''}
        </div>

      </div>` : `
      <div class="tc-card-body" style="${isOpen ? '' : 'display:none'}">
        <div class="perm-denied-banner">
          <span class="perm-denied-icon">🔒</span>
          <div class="perm-denied-text"><strong>Cannot Edit</strong>${blocked}</div>
        </div>
        <div class="form-action-bar" style="border-top:none;">
          <button class="btn btn-secondary btn-cancel-edit" data-id="${tc.testCaseId}">✕ Close</button>
        </div>
      </div>`;

    return `
    <div class="tc-card ${isOpen ? 'expanded' : ''}" data-id="${tc.testCaseId}">
      <div class="tc-card-head">
        <div class="tc-type-badge">${icon}</div>
        <div class="tc-card-main">
          <div class="tc-card-name">${escHtml(tc.testCaseName)}</div>
          <div class="tc-card-meta">
            <span class="tc-pill tc-pill-id">${tc.testCaseId}</span>
            <span class="tc-pill ${statusCls}">${statusLabel}</span>
            <span class="tc-pill ${priCls}">${tc.priority || '—'}</span>
            <span class="tc-pill tc-pill-env">${tc.environment || '—'}</span>
            <span class="tc-pill tc-pill-type">${tc.testingType || '—'}</span>
            ${!canEdit ? `<span class="tc-pill" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;">🔒 Locked</span>` : ''}
          </div>
        </div>
        <div class="tc-card-right">
          <div class="tc-date">
            <div>${fmtDateShort(tc.updatedTimestamp || tc.createdTimestamp)}</div>
            <div style="color:var(--gray-mid);font-size:9px;">v${tc.version || 1} · ${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <button class="tc-expand-btn btn-open-edit ${isOpen ? 'open' : ''}" data-id="${tc.testCaseId}" title="${canEdit ? 'Edit' : 'View'}">
            ${canEdit ? '✏️' : '▾'}
          </button>
        </div>
      </div>
      ${editSection}
    </div>`;
  }

  // ── Toggle a card open/closed ─────────────────────────────
  function toggleEditCard(tcId) {
    if (activeEditId === tcId) { cancelEdit(tcId); return; }
    if (hasUnsaved && activeEditId) {
      pendingOpenId = tcId;
      openModal('discardModal'); return;
    }
    openCard(tcId);
  }

  function openCard(tcId) {
    activeEditId = tcId;
    hasUnsaved = false;
    document.getElementById('unsavedBadge').classList.remove('visible');
    render();
    // Wire tag inputs and step builders after render
    wireTagInputsForUpdate(tcId);
    wireStepBuildersForUpdate();
    wireChangedHighlights(tcId);
    // Scroll card into view
    setTimeout(() => {
      const el = document.querySelector(`[data-id="${tcId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function cancelEdit(tcId) {
    activeEditId = null; hasUnsaved = false;
    document.getElementById('unsavedBadge').classList.remove('visible');
    render();
  }

  // ── Change detection highlights ───────────────────────────
  function wireChangedHighlights(tcId) {
    const card = document.querySelector(`[data-id="${tcId}"]`);
    if (!card) return;
    card.querySelectorAll('input[data-original],textarea[data-original],select[data-original]').forEach(el => {
      el.addEventListener('input', () => markChanged(el));
      el.addEventListener('change', () => markChanged(el));
    });
  }

  function markChanged(el) {
    const changed = el.value !== el.dataset.original;
    el.classList.toggle('field-changed', changed);
    checkAnyUnsaved();
  }

  function checkAnyUnsaved() {
    const card = document.querySelector(`[data-id="${activeEditId}"]`);
    hasUnsaved = card ? card.querySelectorAll('.field-changed').length > 0 : false;
    document.getElementById('unsavedBadge').classList.toggle('visible', hasUnsaved);
  }

  // ── Tag input wiring for update cards ────────────────────
  function wireTagInputsForUpdate(tcId) {
    const wrapper = document.getElementById(`upd-tagwrap-${tcId}`);
    if (!wrapper) return;
    const tagInput = wrapper.querySelector('.upd-tag-input');
    if (!tagInput) return;

    // Wire remove buttons on existing chips
    wrapper.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => { btn.closest('.tag-chip').remove(); hasUnsaved = true; document.getElementById('unsavedBadge').classList.add('visible'); });
    });

    tagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = tagInput.value.trim().replace(/,/g, '');
        if (!v) return;
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${escHtml(v)}<button class="tag-chip-remove" title="Remove">×</button>`;
        chip.querySelector('button').addEventListener('click', () => chip.remove());
        wrapper.insertBefore(chip, tagInput);
        tagInput.value = '';
        hasUnsaved = true;
        document.getElementById('unsavedBadge').classList.add('visible');
      } else if (e.key === 'Backspace' && !tagInput.value) {
        wrapper.querySelector('.tag-chip:last-of-type')?.remove();
      }
    });
    wrapper.addEventListener('click', () => tagInput.focus());
  }

  // ── Step builder wiring for update cards ─────────────────
  function wireStepBuildersForUpdate() {
    document.querySelectorAll('.steps-list').forEach(list => {
      list.querySelectorAll('.step-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const row = btn.closest('.step-row');
          if (list.children.length > 1) { row.remove(); renumberSteps(list); hasUnsaved = true; document.getElementById('unsavedBadge').classList.add('visible'); }
        });
      });
    });
    document.querySelectorAll('.add-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = document.getElementById(btn.dataset.stepsId);
        if (!list) return;
        const num = list.children.length + 1;
        const row = document.createElement('div'); row.className = 'step-row';
        row.innerHTML = `<span class="step-number">${num}.</span><input type="text" class="step-input" placeholder="Step ${num}…" /><button class="step-remove" title="Remove">×</button>`;
        row.querySelector('.step-remove').addEventListener('click', () => {
          if (list.children.length > 1) { row.remove(); renumberSteps(list); }
        });
        list.appendChild(row);
        row.querySelector('input').focus();
        hasUnsaved = true;
        document.getElementById('unsavedBadge').classList.add('visible');
      });
    });
  }

  function renumberSteps(list) {
    list.querySelectorAll('.step-number').forEach((n, i) => { n.textContent = `${i + 1}.`; });
  }

  // ── Collect updated values from open edit card ────────────
  function collectUpdates(tcId) {

  const tc = allTestCases.find(t => t.testCaseId === tcId);

  const nameEl = document.getElementById(`upd-name-${tcId}`);
  const descEl = document.getElementById(`upd-desc-${tcId}`);
  const projEl = document.getElementById(`upd-project-${tcId}`);
  const prioEl = document.getElementById(`upd-priority-${tcId}`);
  const envEl  = document.getElementById(`upd-env-${tcId}`);
  const wrap   = document.getElementById(`upd-tagwrap-${tcId}`);

  let valid = true;

  const name = nameEl?.value.trim() || '';

  if (!textRules(name).valid) {

    showFieldError(
      nameEl,
      `upd-hint-name-${tcId}`,
      'Name must contain at least 10 characters.'
    );

    valid = false;

  } else {

    clearFieldError(
      nameEl,
      `upd-hint-name-${tcId}`
    );
  }

  const desc = descEl?.value.trim() || '';

  if (!textRules(desc).valid) {

    showFieldError(
      descEl,
      `upd-hint-desc-${tcId}`,
      'Description must contain at least 10 characters.'
    );

    valid = false;

  } else {

    clearFieldError(
      descEl,
      `upd-hint-desc-${tcId}`
    );
  }

  const dynConfig = DYNAMIC_FIELD_CONFIGS[tc?.testingTypeId];
  const dynData = { ...(tc?.dynamicData || {}) };

  if (dynConfig) {

    dynConfig.fields.forEach(f => {

      if (f.type === 'steps') {

        const list = document.getElementById(
          `upd-steps-${tcId}-${f.id}`
        );

        const steps = list
          ? Array.from(list.querySelectorAll('.step-input'))
              .map(i => i.value.trim())
              .filter(Boolean)
          : [];

        dynData[f.id] = steps;

        if (steps.some(step => !textRules(step).valid)) {

          const hint = document.getElementById(
            `upd-hint-${tcId}-${f.id}`
          );

          if (hint) {
            hint.textContent =
              'Each step must contain at least 10 characters.';
            hint.classList.add('visible');
          }

          valid = false;

        } else {

          document
            .getElementById(`upd-hint-${tcId}-${f.id}`)
            ?.classList.remove('visible');
        }

      } else {

        const el = document.getElementById(
          `upd-dyn-${tcId}-${f.id}`
        );

        const val = el ? el.value.trim() : '';

        dynData[f.id] = val;

        if (!val) return;

        if (NUMERIC_FIELDS.includes(f.id)) {

          if (!numericRules(val).valid) {

            showFieldError(
              el,
              `upd-hint-${tcId}-${f.id}`,
              numericRules(val).message
            );

            valid = false;

          } else {

            clearFieldError(
              el,
              `upd-hint-${tcId}-${f.id}`
            );
          }

        } else if (!['httpMethod', 'cvssScore'].includes(f.id)) {

          if (!textRules(val).valid) {

            showFieldError(
              el,
              `upd-hint-${tcId}-${f.id}`,
              textRules(val).message
            );

            valid = false;

          } else {

            clearFieldError(
              el,
              `upd-hint-${tcId}-${f.id}`
            );
          }
        } else {
          clearFieldError(
            el,
            `upd-hint-${tcId}-${f.id}`
          );
        }
      }
    });
  }

  const tags = wrap
    ? Array.from(wrap.querySelectorAll('.tag-chip'))
        .map(c => c.textContent.replace('×', '').trim())
        .filter(Boolean)
    : (tc?.tags || []);

  return {
    valid,
    updates: {
      testCaseName: name,
      description: desc,
      projectId: projEl?.value || tc?.projectId,
      priority: prioEl?.value || tc?.priority,
      environment: envEl?.value || tc?.environment,
      tags,
      dynamicData: dynData,
      lastUpdatedByName: user.name
    }
  };
}

// ── Save the update ───────────────────────────────────────
async function saveUpdate(tcId) {
  const { valid, updates } = collectUpdates(tcId);
  if (!valid) { showToast('⚠ Please fix the highlighted fields.', 'error'); return; }

  const btn = document.querySelector(`.btn-save-update[data-id="${tcId}"]`);
  setLoading(btn, true);
  try {
    const res = await fetch(`${API_BASE}/test-cases/${tcId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, userPosition: user.position, employeeId: user.employeeId })
    });
    const data = await res.json();
    setLoading(btn, false, '💾 Save Changes');
    if (data.success) {
      // Update local state
      const idx = allTestCases.findIndex(t => t.testCaseId === tcId);
      if (idx !== -1) allTestCases[idx] = data.testCase;
      activeEditId = null; hasUnsaved = false;
      document.getElementById('unsavedBadge').classList.remove('visible');
      showToast(`✅ Test case updated to v${data.testCase.version}`, 'success');
      render();
    } else {
      showToast(`✗ ${data.message}`, 'error');
    }
  } catch {
    setLoading(btn, false, '💾 Save Changes');
    showToast('⚠ Server unreachable.', 'error');
  }
}

// ── Discard modal ─────────────────────────────────────────
document.getElementById('discardCancel')?.addEventListener('click', () => {
  pendingOpenId = null; closeModal('discardModal');
});
document.getElementById('discardConfirm')?.addEventListener('click', () => {
  closeModal('discardModal');
  const id = pendingOpenId; pendingOpenId = null;
  activeEditId = null; hasUnsaved = false;
  openCard(id);
});

// ── Filter + sort wiring ──────────────────────────────────
wireFilterInputs(render);
wireSortButtons((f, d) => { sortField = f; sortDir = d; render(); });

loadTestCases();
}

// ═══════════════════════════════════════════════════════════
// APPROVE TEST CASES PAGE  (approve_test.html)
// ═══════════════════════════════════════════════════════════

function initApproveTestPage() {
  if (!document.getElementById('tcCardList') || !window.location.pathname.includes('approve_test')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }
  wireNavBar(user);

  const perms = PERMISSIONS[user.position] || PERMISSIONS['Employee'];
  const canReview = perms.approve === 'review_only';
  const canApprove = perms.approve === true;

  const noAccess = document.getElementById('noApproveAccess');
  const interfaceEl = document.getElementById('approveInterface');
  const scopeBanner = document.getElementById('scopeBanner');

  if (!canReview && !canApprove) {
    if (scopeBanner) scopeBanner.style.display = 'none';
    if (noAccess) {
      document.querySelector('.no-access-role').textContent = user.position || '—';
      noAccess.style.display = 'block';
    }
    if (interfaceEl) interfaceEl.style.display = 'none';
    return;
  }

  if (scopeBanner) {
    scopeBanner.className = `scope-banner ${canApprove ? 'scope-project' : 'scope-team'}`;
    scopeBanner.innerHTML = `<span class="scope-banner-icon">${canApprove ? '✅' : '📝'}</span><div><strong>${canApprove ? 'Approve / Reject' : 'Review Only'}</strong> — ${canApprove ? 'You can approve or reject draft test cases.' : 'You can submit a review comment for draft test cases.'}</div>`;
  }
  if (noAccess) noAccess.style.display = 'none';
  if (interfaceEl) interfaceEl.style.display = 'block';

  let allTestCases = [];
  let projectsMap = {};
  let sortField = 'createdTimestamp';
  let sortDir = 'desc';

  loadProjectsIntoSelect('filterProject').then(map => { projectsMap = map; });

  async function loadTestCases() {
    showSkeletons('tcCardList');
    try {
      const params = new URLSearchParams({ userPosition: user.position, employeeId: user.employeeId });
      const res = await fetch(`${API_BASE}/test-cases?${params}`);
      const data = await res.json();
      if (data.success) {
        allTestCases = (data.testCases || []).filter(tc => !tc.isDeleted && tc.status === 'Draft');
        render();
      } else {
        showListError(data.message || 'Unable to load draft test cases.');
      }
    } catch {
      showListError('Could not connect to the server.');
    }
  }

  function showListError(message) {
    const list = document.getElementById('tcCardList');
    if (!list) return;
    list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><div class="empty-state-title">Unable to load review queue</div><div class="empty-state-sub">${message}</div></div>`;
  }

  function render() {
    const filtered = sortCases(applyFilters(allTestCases, projectsMap), sortField, sortDir);
    const list = document.getElementById('tcCardList');
    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${allTestCases.length}</strong> draft test cases`;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📝</span><div class="empty-state-title">No draft cases to review</div><div class="empty-state-sub">Draft cases will appear here until they are reviewed or updated by their creator.</div></div>`;
      return;
    }

    list.innerHTML = filtered.map(tc => buildReviewCard(tc)).join('');
    list.querySelectorAll('.btn-review-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tcId = btn.dataset.id;
        const action = btn.dataset.action;
        const card = btn.closest('.tc-card');
        const commentEl = card?.querySelector('.review-comment');
        const comment = commentEl?.value.trim() || '';

        if (action === 'review' && comment.length < 10) {
          showToast('⚠ Review comments must be at least 10 characters long.', 'error');
          return;
        }
        if ((action === 'approve' || action === 'reject') && comment.length === 0) {
          showToast('⚠ Review comments are required for approval/rejection.', 'error');
          return;
        }

        setLoading(btn, true);
        try {
          const res = await fetch(`${API_BASE}/test-cases/${tcId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, comment, userPosition: user.position, employeeId: user.employeeId, reviewerName: user.name })
          });
          const data = await res.json();
          setLoading(btn, false, canApprove ? (action === 'approve' ? 'Approve' : 'Reject') : 'Submit Review');
          if (data.success) {
            allTestCases = allTestCases.filter(tc => tc.testCaseId !== tcId);
            render();
            showToast(`✓ ${tcId} ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed'}.`, 'success');
          } else {
            showToast(`✗ ${data.message}`, 'error');
          }
        } catch {
          setLoading(btn, false, canApprove ? (action === 'approve' ? 'Approve' : 'Reject') : 'Submit Review');
          showToast('⚠ Server unreachable.', 'error');
        }
      });
    });
  }

  function buildReviewCard(tc) {
    const icon = typeIcon(tc.testingTypeId || tc.testingType);
    const priCls = `tc-pill-${(tc.priority || 'low').toLowerCase()}`;
    const statusCls = tc.isApproved ? 'tc-pill-approved' : (tc.status === 'Draft' ? 'tc-pill-draft' : 'tc-pill-pending');
    const statusLabel = tc.isApproved ? '✓ Approved' : tc.status || 'Draft';
    const projName = projectsMap[tc.projectId] || tc.projectId || '—';
    const tagsHtml = (tc.tags || []).length
      ? `<div class="tc-tags">${tc.tags.map(tag => `<span class="tc-tag">${escHtml(tag)}</span>`).join('')}</div>`
      : '—';
    const actionLabel = canApprove ? 'Approve / Reject' : 'Submit Review';

    let dynHtml = '';
    if (tc.dynamicData) {
      const config = DYNAMIC_FIELD_CONFIGS[tc.testingTypeId];
      if (config) {
        dynHtml = `<div class="tc-dynamic-section">
          <div class="tc-dynamic-title">⚗️ ${config.label}</div>
          <div class="tc-detail-grid">`;
        config.fields.forEach(field => {
          const value = tc.dynamicData[field.id];
          if (!value || (Array.isArray(value) && !value.length)) return;
          if (field.type === 'steps' && Array.isArray(value)) {
            dynHtml += `<div class="tc-detail-field" style="grid-column:1/-1;">
              <div class="tc-detail-label">${field.label}</div>
              <ol class="tc-steps-list">${value.map((step, idx) => `<li><span class="step-n">${idx + 1}.</span>${escHtml(step)}</li>`).join('')}</ol>
            </div>`;
          } else if (field.type === 'textarea') {
            dynHtml += `<div class="tc-detail-field" style="grid-column:1/-1;">
              <div class="tc-detail-label">${field.label}</div>
              <div class="tc-detail-value mono">${escHtml(value)}</div>
            </div>`;
          } else {
            dynHtml += `<div class="tc-detail-field">
              <div class="tc-detail-label">${field.label}</div>
              <div class="tc-detail-value">${escHtml(String(value))}</div>
            </div>`;
          }
        });
        dynHtml += `</div></div>`;
      }
    }

    return `
    <div class="tc-card review-card" data-id="${tc.testCaseId}">
      <div class="tc-card-head">
        <div class="tc-type-badge">${icon}</div>
        <div class="tc-card-main">
          <div class="tc-card-name">${escHtml(tc.testCaseName)}</div>
          <div class="tc-card-meta">
            <span class="tc-pill tc-pill-id">${tc.testCaseId}</span>
            <span class="tc-pill ${statusCls}">${statusLabel}</span>
            <span class="tc-pill ${priCls}">${tc.priority || '—'}</span>
            <span class="tc-pill tc-pill-env">${tc.environment || '—'}</span>
            <span class="tc-pill tc-pill-type">${tc.testingType || '—'}</span>
          </div>
        </div>
        <div class="tc-card-right">
          <div class="tc-date">
            <div>${fmtDateShort(tc.createdTimestamp)}</div>
            <div style="color:var(--gray-mid);font-size:9px;">by ${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <button class="tc-expand-btn" title="Expand details">▾</button>
        </div>
      </div>
      <div class="tc-card-body">
        <div class="tc-detail-grid">
          <div class="tc-detail-field">
            <div class="tc-detail-label">Test Case ID</div>
            <div class="tc-detail-value mono">${tc.testCaseId}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Project</div>
            <div class="tc-detail-value">${escHtml(projName)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Testing Type</div>
            <div class="tc-detail-value">${icon} ${escHtml(tc.testingType || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Priority</div>
            <div class="tc-detail-value">${escHtml(tc.priority || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Environment</div>
            <div class="tc-detail-value">${escHtml(tc.environment || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Status</div>
            <div class="tc-detail-value">${statusLabel}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Version</div>
            <div class="tc-detail-value">v${tc.version || 1}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Created By</div>
            <div class="tc-detail-value">${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Created At</div>
            <div class="tc-detail-value">${fmtDate(tc.createdTimestamp)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Last Updated</div>
            <div class="tc-detail-value">${fmtDate(tc.updatedTimestamp)}</div>
          </div>
          <div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">Description</div>
            <div class="tc-detail-value">${escHtml(tc.description || '—')}</div>
          </div>
          <div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">Tags</div>
            <div class="tc-detail-value">${tagsHtml}</div>
          </div>
          ${tc.reviewComment ? `<div class="tc-detail-field" style="grid-column:1/-1;border-top:1px solid var(--gray-light);padding-top:12px;margin-top:12px;">
            <div class="tc-detail-label">📝 Review Comment</div>
            <div class="tc-detail-value" style="background:var(--gray-light);padding:12px;border-radius:6px;">${escHtml(tc.reviewComment)}</div>
          </div>` : ''}
        </div>
        ${dynHtml}
        <div class="review-action-row">
          <div class="review-panel">
            <label class="review-label" for="review-comment-${tc.testCaseId}">Review comments <span style="color:var(--error)">*</span> </label>
            <textarea id="review-comment-${tc.testCaseId}" class="review-comment" placeholder="${canApprove ? 'Enter a review comment (required)' : 'Enter a review comment (at least 10 characters)'}"></textarea>
            <div class="review-action-buttons">
              ${canApprove ? `<button class="btn btn-secondary btn-sm btn-review-action" data-id="${tc.testCaseId}" data-action="reject">Reject</button><button class="btn btn-primary btn-sm btn-review-action" data-id="${tc.testCaseId}" data-action="approve">Approve</button>` : `<button class="btn btn-primary btn-sm btn-review-action" data-id="${tc.testCaseId}" data-action="review">${actionLabel}</button>`}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  wireFilterInputs(render);
  wireSortButtons((f, d) => { sortField = f; sortDir = d; render(); });
  loadTestCases();
}

// ═══════════════════════════════════════════════════════════
// DELETE TEST CASES PAGE  (delete_test.html)
// ═══════════════════════════════════════════════════════════

function initDeleteTestPage() {
  if (!window.location.pathname.includes('delete_test')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }
  wireNavBar(user);

  const perms = PERMISSIONS[user.position] || PERMISSIONS['Employee'];
  const deleteScope = perms.delete;

  // ── No permission state ───────────────────────────────────
  if (!deleteScope) {
    document.getElementById('noPermState').style.display = 'block';
    document.getElementById('deleteInterface').style.display = 'none';
    document.getElementById('noPermRole').textContent = user.position;
    return;
  }

  // ── Show delete type warning banner ──────────────────────
  const deleteDescriptions = {
    soft_project: { title: 'Soft Delete — Project Scope', desc: 'Test cases will be marked as deleted but not permanently removed. Only cases within your project scope can be deleted.', pillText: 'SOFT DELETE', pillCls: 'del-type-soft' },
    soft: { title: 'Soft Delete', desc: 'Test cases will be marked as deleted but can be restored by Senior Manager and above.', pillText: 'SOFT DELETE', pillCls: 'del-type-soft' },
    soft_restore: { title: 'Soft Delete + Restore', desc: 'You can soft-delete cases and restore previously soft-deleted ones.', pillText: 'SOFT + RESTORE', pillCls: 'del-type-soft' },
    permanent: { title: 'Permanent Delete — Director Access', desc: 'Test cases will be permanently removed from the system and cannot be recovered.', pillText: 'PERMANENT DELETE', pillCls: 'del-type-hard' },
  };
  const dd = deleteDescriptions[deleteScope] || deleteDescriptions.soft;
  document.getElementById('deleteWarnTitle').textContent = dd.title;
  document.getElementById('deleteWarnDesc').textContent = dd.desc;
  document.getElementById('deleteTypePill').innerHTML = `<span class="${dd.pillCls}">${dd.pillText}</span>`;

  let allTestCases = [];
  let projectsMap = {};
  let sortField = 'createdTimestamp';
  let sortDir = 'desc';
  let pendingDelete = null; // { tcId, name }

  loadProjectsIntoSelect('filterProject').then(m => { projectsMap = m; });

  // ── Fetch test cases ──────────────────────────────────────
  async function loadTestCases() {
    showSkeletons('tcCardList');
    try {
      const params = new URLSearchParams({ userPosition: user.position, employeeId: user.employeeId, includeDeleted: 'true' });
      const res = await fetch(`${API_BASE}/test-cases?${params}`);
      const data = await res.json();
      if (data.success) { allTestCases = data.testCases; render(); }
      else showListError(data.message);
    } catch { showListError('Could not connect to server. Make sure it is running on port 3000.'); }
  }

  function showListError(msg) {
    document.getElementById('tcCardList').innerHTML = `
      <div class="empty-state"><span class="empty-state-icon">⚠️</span>
        <div class="empty-state-title">Error</div><div class="empty-state-sub">${msg}</div></div>`;
  }

  // ── Determine if user can delete a specific tc ────────────
  function canDeleteThisTc(tc) {
    if (!deleteScope) return false;
    if (deleteScope === 'soft_project') {
      const lowerTiers = Object.entries(PERMISSIONS).filter(([, p]) => p.tier <= perms.tier).map(([pos]) => pos);
      return lowerTiers.includes(tc.creatorPosition) || tc.createdBy === user.employeeId;
    }
    return true; // Manager and above
  }

  function canRestoreThisTc(tc) {
    return tc.isDeleted && (deleteScope === 'soft_restore' || deleteScope === 'permanent');
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    const filtered = sortCases(applyFilters(allTestCases, projectsMap), sortField, sortDir);
    const list = document.getElementById('tcCardList');
    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${allTestCases.length}</strong> test cases`;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🗑️</span>
        <div class="empty-state-title">No Test Cases Found</div>
        <div class="empty-state-sub">${allTestCases.length === 0
          ? 'There are no test cases to delete.'
          : 'No results match your filters.'}</div></div>`;
      return;
    }

    list.innerHTML = filtered.map(tc => buildDeleteCard(tc)).join('');

    // Wire expand toggles
    list.querySelectorAll('.tc-card-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('.btn-danger,.btn-secondary')) return;
        const card = head.closest('.tc-card');
        const btn = head.querySelector('.tc-expand-btn');
        card.classList.toggle('expanded');
        btn.classList.toggle('open');
      });
    });

    // Wire delete buttons
    list.querySelectorAll('.btn-trigger-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tcId = btn.dataset.id;
        const tcName = btn.dataset.name;
        triggerDeleteModal(tcId, tcName);
      });
    });

    // Wire restore buttons
    list.querySelectorAll('.btn-trigger-restore').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tcId = btn.dataset.id;
        const tcName = btn.dataset.name;
        restoreTestCase(tcId, tcName);
      });
    });
  }

  function buildDeleteCard(tc) {
    const icon = typeIcon(tc.testingTypeId || tc.testingType);
    const priCls = `tc-pill-${(tc.priority || 'low').toLowerCase()}`;
    const statusCls = tc.isApproved ? 'tc-pill-approved' : (tc.status === 'Draft' ? 'tc-pill-draft' : 'tc-pill-pending');
    const statusLabel = tc.isApproved ? '✓ Approved' : (tc.status || 'Draft');
    const projName = projectsMap[tc.projectId] || tc.projectId || '—';
    const canDel = canDeleteThisTc(tc);
    const isPermanent = deleteScope === 'permanent';

    return `
    <div class="tc-card ${tc.isDeleted ? 'tc-card-deleted' : ''}" data-id="${tc.testCaseId}">
      <div class="tc-card-head">
        <div class="tc-type-badge">${icon}</div>
        <div class="tc-card-main">
          <div class="tc-card-name">${escHtml(tc.testCaseName)}</div>
          <div class="tc-card-meta">
            <span class="tc-pill tc-pill-id">${tc.testCaseId}</span>
            <span class="tc-pill ${statusCls}">${statusLabel}</span>
            ${tc.isDeleted ? `<span class="tc-pill tc-pill-rejected">Deleted</span>` : ''}
            <span class="tc-pill ${priCls}">${tc.priority || '—'}</span>
            <span class="tc-pill tc-pill-env">${tc.environment || '—'}</span>
            <span class="tc-pill tc-pill-type">${tc.testingType || '—'}</span>
          </div>
        </div>
        <div class="tc-card-right">
          <div class="tc-date">
            <div>${fmtDateShort(tc.createdTimestamp)}</div>
            <div style="color:var(--gray-mid);font-size:9px;">by ${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <button class="tc-expand-btn" title="Expand details">▾</button>
        </div>
      </div>

      <!-- Expanded detail + delete action row -->
      <div class="tc-card-body">
        <div class="tc-detail-grid">
          <div class="tc-detail-field">
            <div class="tc-detail-label">Test Case ID</div>
            <div class="tc-detail-value mono">${tc.testCaseId}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Project</div>
            <div class="tc-detail-value">${escHtml(projName)}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Testing Type</div>
            <div class="tc-detail-value">${icon} ${escHtml(tc.testingType || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Priority</div>
            <div class="tc-detail-value">${escHtml(tc.priority || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Environment</div>
            <div class="tc-detail-value">${escHtml(tc.environment || '—')}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Version</div>
            <div class="tc-detail-value">v${tc.version || 1}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Approval</div>
            <div class="tc-detail-value">${tc.isApproved ? '✅ Approved' : '📝 Not Approved'}</div>
          </div>
          <div class="tc-detail-field">
            <div class="tc-detail-label">Created By</div>
            <div class="tc-detail-value">${escHtml(tc.createdByName || tc.createdBy)}</div>
          </div>
          <div class="tc-detail-field" style="grid-column:1/-1;">
            <div class="tc-detail-label">Description</div>
            <div class="tc-detail-value">${escHtml(tc.description || '—')}</div>
          </div>
        </div>
      </div>

      <!-- Delete action row always visible at bottom -->
      <div class="tc-card-del-row">
        ${tc.isDeleted
          ? canRestoreThisTc(tc)
            ? `<button class="btn btn-secondary btn-sm btn-trigger-restore" data-id="${tc.testCaseId}" data-name="${escHtml(tc.testCaseName)}">↺ Restore</button>`
            : `<span style="font-family:var(--font-mono);font-size:10px;color:var(--gray-mid);">🔒 Deleted test case — restore not allowed</span>`
          : !canDel
            ? `<span style="font-family:var(--font-mono);font-size:10px;color:var(--gray-mid);">🔒 Outside your delete scope</span>`
            : `<span class="${isPermanent ? 'del-type-hard' : 'del-type-soft'}">${isPermanent ? '⚠ Permanent' : '⚠ Soft Delete'}</span>
               <button class="btn btn-danger btn-sm btn-trigger-delete"
                 data-id="${tc.testCaseId}"
                 data-name="${escHtml(tc.testCaseName)}">
                 🗑️ ${'Delete'}
               </button>`
        }
      </div>
    </div>`;
  }

  // ── Confirm modal flow ────────────────────────────────────
  function triggerDeleteModal(tcId, tcName) {
    pendingDelete = { tcId, tcName };
    const isPermanent = deleteScope === 'permanent';
    document.getElementById('confirmTcId').textContent = tcId;
    document.getElementById('confirmTcName').textContent = tcName;
    document.getElementById('confirmDeleteMsg').textContent = isPermanent
      ? 'Choose whether to soft-delete or permanently remove this test case. Permanent deletion cannot be undone.'
      : 'This test case will be marked as deleted and hidden from views. It can be restored by a Senior Manager or Director.';
    const modeBox = document.getElementById('deleteModeOptions');
    if (modeBox) {
      modeBox.style.display = isPermanent ? 'flex' : 'none';
      if (isPermanent) {
        const softRadio = modeBox.querySelector('input[value="soft"]');
        if (softRadio) softRadio.checked = true;
      }
    }
    openModal('confirmDeleteModal');
  }

  document.getElementById('modalCancelDelete')?.addEventListener('click', () => {
    pendingDelete = null; closeModal('confirmDeleteModal');
  });
  document.getElementById('confirmDeleteModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) { pendingDelete = null; closeModal('confirmDeleteModal'); }
  });

  async function restoreTestCase(tcId, tcName) {
    const btn = document.querySelector(`.btn-trigger-restore[data-id="${tcId}"]`);
    setLoading(btn, true);
    try {
      const res = await fetch(`${API_BASE}/test-cases/${tcId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPosition: user.position, employeeId: user.employeeId, restoredByName: user.name })
      });
      const data = await res.json();
      setLoading(btn, false, '↺ Restore');
      if (data.success) {
        const idx = allTestCases.findIndex(tc => tc.testCaseId === tcId);
        if (idx !== -1) allTestCases[idx] = data.testCase;
        showToast(`↺ "${tcName}" restored successfully.`, 'success');
        render();
      } else {
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btn, false, '↺ Restore');
      showToast('⚠ Server unreachable.', 'error');
    }
  }

  document.getElementById('modalConfirmDelete')?.addEventListener('click', async () => {
    if (!pendingDelete) return;
    const { tcId, tcName } = pendingDelete;
    const btn = document.getElementById('modalConfirmDelete');
    setLoading(btn, true);
    try {
      const modeBox = document.getElementById('deleteModeOptions');
      const deleteType = modeBox?.style.display === 'flex'
        ? modeBox.querySelector('input[name="deleteMode"]:checked')?.value || 'soft'
        : 'soft';
      const res = await fetch(`${API_BASE}/test-cases/${tcId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPosition: user.position, employeeId: user.employeeId, deletedByName: user.name, deleteType })
      });
      const data = await res.json();
      setLoading(btn, false, '🗑️ Delete');
      closeModal('confirmDeleteModal');
      pendingDelete = null;
      if (data.success) {
        if (data.deleteType === 'permanently deleted') {
          allTestCases = allTestCases.filter(tc => tc.testCaseId !== tcId);
        } else {
          const idx = allTestCases.findIndex(tc => tc.testCaseId === tcId);
          if (idx !== -1) allTestCases[idx] = { ...allTestCases[idx], isDeleted: true, deletedAt: new Date().toISOString() };
        }
        showToast(`🗑️ "${tcName}" ${data.deleteType}.`, 'success');
        const card = document.querySelector(`[data-id="${tcId}"]`);
        if (card) { card.classList.add('del-success-flash'); setTimeout(() => render(), 400); }
        else render();
      } else {
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btn, false, '🗑️ Delete');
      closeModal('confirmDeleteModal');
      showToast('⚠ Server unreachable.', 'error');
    }
  });

  // ── Filter + sort wiring ──────────────────────────────────
  wireFilterInputs(render);
  wireSortButtons((f, d) => { sortField = f; sortDir = d; render(); });

  loadTestCases();
}

// ═══════════════════════════════════════════════════════════
// INIT — route to correct page
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname;
  if (page.includes('register.html')) initRegisterPage();
  else if (page.includes('create_test.html')) initCreateTestPage();
  else if (page.includes('read_test.html')) initReadTestPage();
  else if (page.includes('update_test.html')) initUpdateTestPage();
  else if (page.includes('approve_test.html')) initApproveTestPage();
  else if (page.includes('delete_test.html')) initDeleteTestPage();
  else initLoginPage();
});
