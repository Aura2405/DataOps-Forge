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

  function toggleVisibility(inputEl, eyeEl) {
    const show = inputEl.type === 'password';
    inputEl.type = show ? 'text' : 'password';
    eyeEl.textContent = show ? '🙈' : '👁';
  }

  togglePwd?.addEventListener('click', () => toggleVisibility(pwdInput, document.getElementById('eyePwd')));
  toggleConfirm?.addEventListener('click', () => toggleVisibility(confirmInput, document.getElementById('eyeConfirm')));

  pwdInput.addEventListener('input', () => {
    updatePasswordUI(pwdInput.value);
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
      const existing = document.getElementById('permissionBadge');
      if (existing) existing.style.display = 'none';
    }
  });

  nameInput.addEventListener('blur', () => {
    if (!nameInput.value.trim()) setInputState(nameInput, hints.name, 'error', 'Name cannot be empty.');
    else setInputState(nameInput, hints.name, 'success');
  });
  nameInput.addEventListener('input', () => {
    if (nameInput.classList.contains('input-error')) {
      nameInput.classList.remove('input-error');
      hints.name.classList.remove('visible');
    }
  });

  empIdInput.addEventListener('blur', () => {
    if (!empIdInput.value.trim()) setInputState(empIdInput, hints.empid, 'error', 'Employee ID cannot be empty.');
    else setInputState(empIdInput, hints.empid, 'success');
  });
  empIdInput.addEventListener('input', () => {
    if (empIdInput.classList.contains('input-error')) {
      empIdInput.classList.remove('input-error');
      hints.empid.classList.remove('visible');
    }
  });

  emailInput.addEventListener('blur', () => {
    if (!emailInput.value.trim()) setInputState(emailInput, hints.email, 'error', 'Email cannot be empty.');
    else if (!isValidEmail(emailInput.value.trim())) setInputState(emailInput, hints.email, 'error', 'Please enter a valid email address.');
    else setInputState(emailInput, hints.email, 'success');
  });
  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error')) {
      emailInput.classList.remove('input-error');
      hints.email.classList.remove('visible');
    }
  });

  function validateRegisterForm() {
    let valid = true;
    if (!nameInput.value.trim()) { setInputState(nameInput, hints.name, 'error', 'Name cannot be empty.'); valid = false; }
    if (!positionSel.value) { setInputState(positionSel, hints.pos, 'error', 'Please select a position.'); valid = false; }
    if (!empIdInput.value.trim()) { setInputState(empIdInput, hints.empid, 'error', 'Employee ID cannot be empty.'); valid = false; }
    if (!emailInput.value.trim()) { setInputState(emailInput, hints.email, 'error', 'Please enter an email address.'); valid = false; }
    else if (!isValidEmail(emailInput.value.trim())) { setInputState(emailInput, hints.email, 'error', 'Please enter a valid email address.'); valid = false; }
    const pwdResult = validatePassword(pwdInput.value);
    if (!pwdInput.value) { setInputState(pwdInput, hints.pwd, 'error', 'Password cannot be empty.'); valid = false; }
    else if (!pwdResult.passed) { setInputState(pwdInput, hints.pwd, 'error', 'Password does not meet all requirements.'); valid = false; }
    if (!confirmInput.value) { setInputState(confirmInput, hints.confirm, 'error', 'Please confirm your password.'); valid = false; }
    else if (confirmInput.value !== pwdInput.value) { setInputState(confirmInput, hints.confirm, 'error', 'Passwords do not match.'); valid = false; }
    return valid;
  }

  btnRegister.addEventListener('click', async () => {
    if (!validateRegisterForm()) return;
    const btn = btnRegister;
    setLoading(btn, true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          position: positionSel.value,
          employeeId: empIdInput.value.trim(),
          email: emailInput.value.trim(),
          password: pwdInput.value
        })
      });
      const data = await res.json();
      setLoading(btn, false, 'Register');
      if (data.success) {
        openModal('successModal');
      } else {
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btn, false, 'Register');
      showToast('⚠ Registration failed. Is the server running?', 'error');
    }
  });

  document.getElementById('btnBack')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  document.getElementById('successGoHome')?.addEventListener('click', () => { window.location.href = 'index.html'; });
}

document.addEventListener('DOMContentLoaded', initRegisterPage);
