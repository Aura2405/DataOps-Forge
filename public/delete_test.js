(function () {
  if (window.__dataopsDeletePageHooked) return;
  window.__dataopsDeletePageHooked = true;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('delete_test.html') && typeof initDeleteTestPage === 'function' && !window.__dataopsDeletePageInitialized) {
      initDeleteTestPage();
    }
  });
})();
