// Runtime configuration - points to Render backend
(function () {
  var cfg = (window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {});
  cfg.API_BASE = 'https://vehicle-insurance-backend-a3i7.onrender.com';
  cfg.SOCKET_URL = 'https://vehicle-insurance-backend-a3i7.onrender.com/';
  cfg.VITE_API_BASE = 'https://vehicle-insurance-backend-a3i7.onrender.com';

  // Load admin spinner script from server
  if (window.location.pathname.indexOf('admin') !== -1) {
    var s = document.createElement('script');
    s.src = cfg.API_BASE + '/admin-spinner.js';
    s.defer = true;
    document.head.appendChild(s);
  }
})();
