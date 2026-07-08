(function () {
  if (window.__dataopsReadPageHooked) return;
  window.__dataopsReadPageHooked = true;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('read_test.html') && typeof initReadTestPage === 'function' && !window.__dataopsReadPageInitialized) {
      initReadTestPage();
    }
  });
})();
