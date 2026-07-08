(function () {
  if (window.__dataopsUpdatePageHooked) return;
  window.__dataopsUpdatePageHooked = true;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('update_test.html') && typeof initUpdateTestPage === 'function' && !window.__dataopsUpdatePageInitialized) {
      initUpdateTestPage();
    }
  });
})();
