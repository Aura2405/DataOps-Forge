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
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
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

document.addEventListener('DOMContentLoaded', initLoginPage);
