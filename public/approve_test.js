(function () {
  if (window.__dataopsApprovePageHooked) return;
  window.__dataopsApprovePageHooked = true;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('approve_test.html') && typeof initApproveTestPage === 'function' && !window.__dataopsApprovePageInitialized) {
      initApproveTestPage();
    }
  });
})();
