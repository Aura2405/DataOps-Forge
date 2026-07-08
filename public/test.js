function initDashboardPage() {
  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) {
    window.location.href = 'index.html';
    return;
  }

  wireNavBar(user);

  document.getElementById('heroName').textContent = (user.name || 'Engineer').split(' ')[0];
  document.getElementById('heroPill-id').textContent = 'ID: ' + (user.employeeId || '—');
  document.getElementById('heroPill-role').textContent = 'Role: ' + (user.position || '—');
  document.getElementById('heroPill-email').textContent = user.email || '—';

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem('forge_user');
    window.location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', initDashboardPage);
