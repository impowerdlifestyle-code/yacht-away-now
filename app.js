// ═══════════════════════════════════════════════════════════════
//  Yacht Away Now — Premium Interactive JavaScript
// ═══════════════════════════════════════════════════════════════

// ─── Scroll-based navbar + scroll-to-top visibility ───
window.addEventListener('scroll', function() {
  var navbar = document.getElementById('navbar');
  var scrollTop = document.getElementById('scrollTop');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
  if (scrollTop) scrollTop.classList.toggle('visible', window.scrollY > 400);
});

// ─── Mobile nav toggle ───
function toggleMobile() {
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('mobileToggle').classList.toggle('open');
}

// Close mobile menu when any nav link is tapped
document.addEventListener('DOMContentLoaded', function() {
  var navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      var menu = document.getElementById('navLinks');
      var toggle = document.getElementById('mobileToggle');
      if (menu && menu.classList.contains('open')) {
        menu.classList.remove('open');
        toggle.classList.remove('open');
      }
    });
  });
});

// ─── Scroll reveal with stagger effect ───
function initReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        // Find siblings to stagger within the same parent
        var parent = entry.target.parentElement;
        var siblings = parent ? Array.from(parent.querySelectorAll('.reveal:not(.visible)')) : [];
        var index = siblings.indexOf(entry.target);
        var delay = index >= 0 ? index * 120 : 0;

        setTimeout(function() {
          entry.target.classList.add('visible');
        }, delay);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(function(el) {
    observer.observe(el);
  });
}

// ─── Active nav link ───
function setActiveNav() {
  var path = window.location.pathname.replace(/\/$/, '').toLowerCase();
  if (path === '' || path === '/index.html') path = '/';
  document.querySelectorAll('.nav-links a[href]').forEach(function(a) {
    var href = a.getAttribute('href').replace(/\/$/, '').toLowerCase();
    if (href === '' || href === '/index.html') href = '/';
    if (a.classList.contains('nav-cta') || a.classList.contains('nav-phone')) return;
    a.classList.toggle('active', href === path);
  });
}

// ─── Form handling (Formspree) ───
function handleFormSubmit(e) {
  e.preventDefault();
  var form = document.getElementById('contactForm');
  var data = new FormData(form);
  fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
    .then(function(r) {
      if (r.ok) {
        form.style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
      } else {
        alert('Something went wrong. Please call (727) 609-2248 directly.');
      }
    })
    .catch(function() {
      alert('Network error. Please call (727) 609-2248 directly.');
    });
}

// ─── FAQ toggle ───
function toggleFaq(el) {
  el.closest('.faq-item').classList.toggle('open');
}


// ═══════════════════════════════════════════════════════════════
//  PREMIUM FEATURES
// ═══════════════════════════════════════════════════════════════

// ─── 1. Scroll Progress Bar (gold) ───
function initScrollProgress() {
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', function() {
    var scrollable = document.body.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    var pct = (window.scrollY / scrollable) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ─── 2. Counter Animation (hero stats) ───
function initCounters() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var text = el.textContent;
        var match = text.match(/^([\d,]+)/);
        if (!match) return;

        var target = parseInt(match[1].replace(/,/g, ''));
        var suffix = text.slice(match[1].length);
        var current = 0;
        var duration = 2000;
        var step = target / (duration / 16);

        var timer = setInterval(function() {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.innerHTML = Math.floor(current).toLocaleString() + suffix;
        }, 16);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.hero-stat-value').forEach(function(el) {
    observer.observe(el);
  });
}

// ─── 3. Photo Lightbox ───
function initLightbox() {
  var images = Array.from(document.querySelectorAll('.gallery-item img'));
  if (images.length === 0) return;

  // Create lightbox DOM
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.id = 'lightbox';
  lb.innerHTML =
    '<button class="lightbox-close" aria-label="Close">&times;</button>' +
    '<button class="lightbox-prev" aria-label="Previous">&#8249;</button>' +
    '<img src="" alt="" id="lightbox-img">' +
    '<button class="lightbox-next" aria-label="Next">&#8250;</button>' +
    '<div class="lightbox-counter"><span id="lightbox-current">1</span> / <span id="lightbox-total">1</span></div>';
  document.body.appendChild(lb);

  var currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    document.getElementById('lightbox-img').src = images[index].src;
    document.getElementById('lightbox-img').alt = images[index].alt;
    document.getElementById('lightbox-current').textContent = index + 1;
    document.getElementById('lightbox-total').textContent = images.length;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Attach click to each gallery item
  images.forEach(function(img, i) {
    var item = img.closest('.gallery-item');
    if (item) {
      item.style.cursor = 'pointer';
      item.addEventListener('click', function() { openLightbox(i); });
    }
  });

  // Controls
  lb.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lb.querySelector('.lightbox-prev').addEventListener('click', function() {
    openLightbox((currentIndex - 1 + images.length) % images.length);
  });
  lb.querySelector('.lightbox-next').addEventListener('click', function() {
    openLightbox((currentIndex + 1) % images.length);
  });

  // Click backdrop to close
  lb.addEventListener('click', function(e) {
    if (e.target === lb) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') openLightbox((currentIndex - 1 + images.length) % images.length);
    if (e.key === 'ArrowRight') openLightbox((currentIndex + 1) % images.length);
  });
}

// ─── 4. Flowing Water & Waves Background ───
function initParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'particles-canvas';
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var w, h;
  var time = 0;
  var scrollY = 0;
  var mouseX = 0.5;
  var mouseY = 0.5;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('scroll', function() {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('mousemove', function(e) {
    mouseX = e.clientX / w;
    mouseY = e.clientY / h;
  }, { passive: true });

  // ── Wave layers ──
  // Slow, gentle swells like real ocean water
  var waves = [
    { amp: 25, freq: 0.0012, speed: 0.0012, yOff: 0.22, r: 78, g: 205, b: 196, alpha: 0.02 },
    { amp: 18, freq: 0.0018, speed: 0.0018, yOff: 0.30, r: 26, g: 139, b: 179, alpha: 0.018 },
    { amp: 35, freq: 0.0008, speed: 0.0008, yOff: 0.48, r: 78, g: 205, b: 196, alpha: 0.016 },
    { amp: 15, freq: 0.0022, speed: 0.0022, yOff: 0.55, r: 43, g: 186, b: 213, alpha: 0.014 },
    { amp: 40, freq: 0.0006, speed: 0.0006, yOff: 0.72, r: 26, g: 139, b: 179, alpha: 0.02 },
    { amp: 22, freq: 0.0015, speed: 0.0014, yOff: 0.80, r: 78, g: 205, b: 196, alpha: 0.016 },
    { amp: 12, freq: 0.0025, speed: 0.002,  yOff: 0.92, r: 201, g: 168, b: 76,  alpha: 0.01 },
  ];

  // ── Caustic light ripples ──
  var caustics = [];
  for (var i = 0; i < 10; i++) {
    caustics.push({
      x: Math.random() * 2 - 0.5,
      y: Math.random(),
      size: Math.random() * 250 + 120,
      speed: Math.random() * 0.00015 + 0.00005,
      drift: Math.random() * 0.00008 - 0.00004,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.025 + 0.008
    });
  }

  // ── Floating particles (sea spray / light motes) ──
  var motes = [];
  for (var j = 0; j < 15; j++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.4,
      speedX: (Math.random() - 0.5) * 0.00012,
      speedY: Math.random() * -0.00015 - 0.00005,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.35 + 0.08,
      isGold: j < 4
    });
  }

  function drawWave(wave, t) {
    var scrollOffset = scrollY * 0.03;
    var mouseInfluence = (mouseX - 0.5) * 6;
    var baseY = h * wave.yOff + scrollOffset;
    // Slow time factor — like watching real water
    var st = t * 0.4;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (var x = 0; x <= w; x += 4) {
      var distFromMouse = Math.abs(x / w - mouseX);
      var mouseBulge = Math.exp(-distFromMouse * distFromMouse * 6) * 8 * (mouseY - 0.5);

      // Primary swell — long, slow, dominant
      var y = baseY
        + Math.sin(x * wave.freq + st * wave.speed * 10) * wave.amp
        // Secondary ripple — smaller, slightly faster
        + Math.sin(x * wave.freq * 1.8 + st * wave.speed * 14 + 1.3) * wave.amp * 0.3
        // Tertiary texture — gentle surface variation
        + Math.cos(x * wave.freq * 3.1 + st * wave.speed * 8 + 2.7) * wave.amp * 0.12
        // Very slow deep undulation
        + Math.sin(x * wave.freq * 0.4 + st * 0.001) * wave.amp * 0.5
        + mouseInfluence * Math.sin(x * 0.003 + st * 0.005)
        + mouseBulge;

      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    var grad = ctx.createLinearGradient(0, baseY - wave.amp, 0, h);
    grad.addColorStop(0, 'rgba(' + wave.r + ',' + wave.g + ',' + wave.b + ',' + wave.alpha + ')');
    grad.addColorStop(0.5, 'rgba(' + wave.r + ',' + wave.g + ',' + wave.b + ',' + wave.alpha * 0.5 + ')');
    grad.addColorStop(1, 'rgba(' + wave.r + ',' + wave.g + ',' + wave.b + ',0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawCaustics(t) {
    for (var i = 0; i < caustics.length; i++) {
      var c = caustics[i];
      var cx = (c.x + Math.sin(t * 0.08 + c.phase) * 0.06) * w;
      var cy = (c.y + Math.cos(t * 0.05 + c.phase) * 0.04 + scrollY * 0.00005) * h;
      var pulse = 0.8 + Math.sin(t * c.speed * 60 + c.phase) * 0.2;
      var r = c.size * pulse;

      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(78, 205, 196, ' + c.alpha * pulse + ')');
      grad.addColorStop(0.5, 'rgba(26, 139, 179, ' + c.alpha * 0.3 * pulse + ')');
      grad.addColorStop(1, 'rgba(26, 139, 179, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      c.x += c.drift * 0.3;
      c.y += Math.sin(t * 0.1 + c.phase) * 0.00002;
      if (c.x > 1.5) c.x = -0.5;
      if (c.x < -0.5) c.x = 1.5;
    }
  }

  function drawMotes(t) {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var px = m.x * w + Math.sin(t * 0.12 + m.phase) * 15;
      var py = m.y * h;
      var flicker = 0.7 + Math.sin(t * 0.4 + m.phase) * 0.3;

      ctx.beginPath();
      ctx.arc(px, py, m.size, 0, Math.PI * 2);
      if (m.isGold) {
        ctx.fillStyle = 'rgba(201, 168, 76, ' + m.alpha * flicker + ')';
      } else {
        ctx.fillStyle = 'rgba(78, 205, 196, ' + m.alpha * flicker * 0.6 + ')';
      }
      ctx.fill();

      m.x += m.speedX + Math.sin(t * 0.1 + m.phase) * 0.00002;
      m.y += m.speedY;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      if (m.x > 1.05) m.x = -0.05;
      if (m.x < -0.05) m.x = 1.05;
    }
  }

  var isVisible = true;
  document.addEventListener('visibilitychange', function() {
    isVisible = !document.hidden;
    if (isVisible) requestAnimationFrame(animate);
  });

  var isMobile = window.innerWidth < 768;

  function animate() {
    if (!isVisible) return;
    time++;
    ctx.clearRect(0, 0, w, h);

    // Caustic light ripples (behind waves)
    if (!isMobile) drawCaustics(time * 0.016);

    // Draw wave layers back to front
    var step = isMobile ? 3 : waves.length;
    for (var i = 0; i < step; i++) {
      drawWave(waves[i], time);
    }

    // Floating motes on top
    if (!isMobile) drawMotes(time * 0.016);

    requestAnimationFrame(animate);
  }

  animate();
}

// ─── 5. Smooth Parallax on Hero Background ───
function initParallax() {
  var hero = document.querySelector('.hero-bg');
  if (!hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (y < window.innerHeight) {
      hero.style.transform = 'translateY(' + (y * 0.3) + 'px)';
    }
  }, { passive: true });
}


// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
// ─── 6. AI Chat Widget ───
function initChatWidget() {
  var chatHTML =
    '<div id="chat-widget" style="position:fixed;bottom:24px;right:24px;z-index:9999;font-family:Montserrat,-apple-system,sans-serif;">' +
      '<div id="chat-window" style="display:none;width:360px;max-width:calc(100vw - 48px);height:500px;max-height:calc(100vh - 120px);background:#0a1f30;border:1px solid #163248;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 30px rgba(212,168,83,0.1);flex-direction:column;overflow:hidden;">' +
        '<div style="padding:16px 20px;background:linear-gradient(135deg,#0b1d2e,#122d45);border-bottom:1px solid #163248;display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853,#ffe5a0,#d4a853);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">&#9875;</div>' +
            '<div><div style="font-weight:600;font-size:0.9rem;color:#f0f7fa;">Yacht Away Now</div><div style="font-size:0.7rem;color:#4ecdc4;">Online — Ready to help</div></div>' +
          '</div>' +
          '<button onclick="toggleChat()" style="background:none;border:none;color:#8bbad4;font-size:1.4rem;cursor:pointer;padding:4px;">&times;</button>' +
        '</div>' +
        '<div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">' +
          '<div style="background:#122d45;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#b8d8e8;line-height:1.6;">Welcome aboard! I\'m your virtual concierge. Ask me anything about our yacht charters, pricing, destinations, or help booking your experience. &#9973;</div>' +
        '</div>' +
        '<div style="padding:12px 16px;border-top:1px solid #163248;display:flex;gap:8px;">' +
          '<input id="chat-input" type="text" placeholder="Ask about charters, pricing..." style="flex:1;padding:10px 16px;border-radius:50px;border:1px solid #163248;background:#071520;color:#f0f7fa;font-size:0.85rem;font-family:inherit;outline:none;" onkeydown="if(event.key===\'Enter\')sendChat()">' +
          '<button onclick="sendChat()" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#b8912e,#d4a853,#ffe5a0,#d4a853);background-size:200% auto;color:#0b1d2e;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">&#10148;</button>' +
        '</div>' +
      '</div>' +
      '<button id="chat-toggle" onclick="toggleChat()" style="width:60px;height:60px;border-radius:50%;border:none;background:linear-gradient(135deg,#b8912e,#d4a853,#ffe5a0,#f0d48a,#d4a853,#b8912e);background-size:200% auto;color:#0b1d2e;font-size:1.6rem;cursor:pointer;box-shadow:0 4px 20px rgba(212,168,83,0.4),0 0 30px rgba(212,168,83,0.15);animation:goldShimmer 5s ease infinite;transition:all 0.3s ease;">' +
        '&#9875;' +
      '</button>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', chatHTML);
}

var chatHistory = [];

function toggleChat() {
  var win = document.getElementById('chat-window');
  var btn = document.getElementById('chat-toggle');
  if (win.style.display === 'none' || win.style.display === '') {
    win.style.display = 'flex';
    btn.style.display = 'none';
    document.getElementById('chat-input').focus();
  } else {
    win.style.display = 'none';
    btn.style.display = 'block';
  }
}

function sendChat() {
  var input = document.getElementById('chat-input');
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  var messages = document.getElementById('chat-messages');

  // Add user message
  var userBubble = document.createElement('div');
  userBubble.style.cssText = 'background:linear-gradient(135deg,#b8912e,#d4a853);border-radius:12px 12px 4px 12px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#0b1d2e;line-height:1.6;align-self:flex-end;font-weight:500;';
  userBubble.textContent = msg;
  messages.appendChild(userBubble);

  // Add typing indicator
  var typing = document.createElement('div');
  typing.style.cssText = 'background:#122d45;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#4ecdc4;line-height:1.6;';
  typing.innerHTML = '<span style="animation:pulse 1s infinite;">Thinking...</span>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;

  chatHistory.push({ role: 'user', content: msg });

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, history: chatHistory })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    messages.removeChild(typing);
    var reply = data.reply || 'Sorry, I had trouble with that. Please call us at (727) 609-2248!';

    // Check if the AI wants to submit a booking
    var bookingMatch = reply.match(/BOOKING_SUBMIT:(\{.*\})/);
    if (bookingMatch) {
      try {
        var booking = JSON.parse(bookingMatch[1]);
        // Remove the JSON line from the displayed reply
        var displayReply = reply.replace(/BOOKING_SUBMIT:\{.*\}/, '').trim();

        // Show a booking confirmation card
        var bookingCard = document.createElement('div');
        bookingCard.style.cssText = 'background:linear-gradient(135deg,#122d45,#1a3550);border:1px solid #d4a853;border-radius:12px;padding:16px;max-width:90%;font-size:0.82rem;color:#b8d8e8;line-height:1.7;';
        bookingCard.innerHTML =
          '<div style="color:#d4a853;font-weight:600;margin-bottom:8px;">&#9875; Booking Submitted!</div>' +
          '<div><strong>Name:</strong> ' + (booking.first_name || '') + ' ' + (booking.last_name || '') + '</div>' +
          '<div><strong>Phone:</strong> ' + (booking.phone || '') + '</div>' +
          '<div><strong>Email:</strong> ' + (booking.email || '') + '</div>' +
          '<div><strong>Charter:</strong> ' + (booking.charter_type || 'TBD') + '</div>' +
          '<div><strong>Date:</strong> ' + (booking.preferred_date || 'Flexible') + '</div>' +
          '<div><strong>Guests:</strong> ' + (booking.guests || 'TBD') + '</div>' +
          '<div><strong>Duration:</strong> ' + (booking.duration || 'TBD') + '</div>' +
          (booking.message ? '<div><strong>Notes:</strong> ' + booking.message + '</div>' : '') +
          '<div style="margin-top:10px;font-size:0.75rem;color:#4ecdc4;">Sending to our concierge team...</div>';
        messages.appendChild(bookingCard);
        messages.scrollTop = messages.scrollHeight;

        // Submit booking to Formspree via our API
        fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
          var statusEl = bookingCard.querySelector('div:last-child');
          if (result.success) {
            statusEl.innerHTML = '&#10003; Sent! Our team will confirm within 24 hours.';
            statusEl.style.color = '#4ecdc4';
          } else {
            statusEl.innerHTML = 'Could not send — please call (727) 609-2248.';
            statusEl.style.color = '#e63946';
          }

          // Add follow-up message from bot
          if (displayReply) {
            var followUp = document.createElement('div');
            followUp.style.cssText = 'background:#122d45;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#b8d8e8;line-height:1.6;';
            followUp.textContent = displayReply;
            messages.appendChild(followUp);
            messages.scrollTop = messages.scrollHeight;
          }
        })
        .catch(function() {
          var statusEl = bookingCard.querySelector('div:last-child');
          statusEl.innerHTML = 'Network error — please call (727) 609-2248.';
          statusEl.style.color = '#e63946';
        });

        chatHistory.push({ role: 'assistant', content: displayReply || 'Booking submitted!' });
        return;
      } catch (e) {
        // JSON parse failed, treat as normal reply
      }
    }

    chatHistory.push({ role: 'assistant', content: reply });

    var botBubble = document.createElement('div');
    botBubble.style.cssText = 'background:#122d45;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#b8d8e8;line-height:1.6;';
    botBubble.textContent = reply;
    messages.appendChild(botBubble);
    messages.scrollTop = messages.scrollHeight;
  })
  .catch(function() {
    messages.removeChild(typing);
    var errBubble = document.createElement('div');
    errBubble.style.cssText = 'background:#122d45;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:0.85rem;color:#b8d8e8;line-height:1.6;';
    errBubble.textContent = 'Having trouble connecting. Give us a call at (727) 609-2248!';
    messages.appendChild(errBubble);
    messages.scrollTop = messages.scrollHeight;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Core features
  initReveal();
  setActiveNav();

  // Premium features
  initScrollProgress();
  initCounters();
  initLightbox();
  initParticles();
  initParallax();
  initChatWidget();
});
