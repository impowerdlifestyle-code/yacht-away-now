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
  // Each wave has: amplitude, frequency, speed, yOffset (0-1), color
  var waves = [
    { amp: 40, freq: 0.003, speed: 0.008, yOff: 0.25, r: 78, g: 205, b: 196, alpha: 0.025 },
    { amp: 30, freq: 0.004, speed: 0.012, yOff: 0.30, r: 26, g: 139, b: 179, alpha: 0.02 },
    { amp: 50, freq: 0.002, speed: 0.006, yOff: 0.50, r: 78, g: 205, b: 196, alpha: 0.018 },
    { amp: 25, freq: 0.005, speed: 0.015, yOff: 0.55, r: 43, g: 186, b: 213, alpha: 0.015 },
    { amp: 60, freq: 0.0015,speed: 0.004, yOff: 0.75, r: 26, g: 139, b: 179, alpha: 0.022 },
    { amp: 35, freq: 0.0035,speed: 0.01,  yOff: 0.80, r: 78, g: 205, b: 196, alpha: 0.018 },
    { amp: 20, freq: 0.006, speed: 0.018, yOff: 0.92, r: 201, g: 168, b: 76,  alpha: 0.012 },
  ];

  // ── Caustic light ripples ──
  var caustics = [];
  for (var i = 0; i < 12; i++) {
    caustics.push({
      x: Math.random() * 2 - 0.5,
      y: Math.random(),
      size: Math.random() * 200 + 80,
      speed: Math.random() * 0.0004 + 0.0002,
      drift: Math.random() * 0.0002 - 0.0001,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.03 + 0.01
    });
  }

  // ── Floating particles (sea spray / light motes) ──
  var motes = [];
  for (var j = 0; j < 20; j++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.0003,
      speedY: Math.random() * -0.0004 - 0.0001,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.4 + 0.1,
      isGold: j < 5
    });
  }

  function drawWave(wave, t) {
    var scrollOffset = scrollY * 0.05;
    var mouseInfluence = (mouseX - 0.5) * 15;
    var baseY = h * wave.yOff + scrollOffset;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (var x = 0; x <= w; x += 3) {
      var distFromMouse = Math.abs(x / w - mouseX);
      var mouseBulge = Math.exp(-distFromMouse * distFromMouse * 8) * 12 * (mouseY - 0.5);

      var y = baseY
        + Math.sin(x * wave.freq + t * wave.speed * 60 + scrollOffset * 0.01) * wave.amp
        + Math.sin(x * wave.freq * 2.3 + t * wave.speed * 40) * wave.amp * 0.4
        + Math.cos(x * wave.freq * 0.7 + t * wave.speed * 25) * wave.amp * 0.3
        + mouseInfluence * Math.sin(x * 0.005 + t * 0.02)
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
      var cx = (c.x + Math.sin(t * 0.3 + c.phase) * 0.1) * w;
      var cy = (c.y + Math.cos(t * 0.2 + c.phase) * 0.08 + scrollY * 0.0001) * h;
      var pulse = 0.7 + Math.sin(t * c.speed * 200 + c.phase) * 0.3;
      var r = c.size * pulse;

      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(78, 205, 196, ' + c.alpha * pulse + ')');
      grad.addColorStop(0.5, 'rgba(26, 139, 179, ' + c.alpha * 0.3 * pulse + ')');
      grad.addColorStop(1, 'rgba(26, 139, 179, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      c.x += c.drift;
      c.y += Math.sin(t + c.phase) * 0.00005;
      if (c.x > 1.5) c.x = -0.5;
      if (c.x < -0.5) c.x = 1.5;
    }
  }

  function drawMotes(t) {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var px = m.x * w + Math.sin(t * 0.5 + m.phase) * 20;
      var py = m.y * h;
      var flicker = 0.6 + Math.sin(t * 2 + m.phase) * 0.4;

      ctx.beginPath();
      ctx.arc(px, py, m.size, 0, Math.PI * 2);
      if (m.isGold) {
        ctx.fillStyle = 'rgba(201, 168, 76, ' + m.alpha * flicker + ')';
      } else {
        ctx.fillStyle = 'rgba(78, 205, 196, ' + m.alpha * flicker * 0.6 + ')';
      }
      ctx.fill();

      m.x += m.speedX + Math.sin(t + m.phase) * 0.00005;
      m.y += m.speedY;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      if (m.x > 1.05) m.x = -0.05;
      if (m.x < -0.05) m.x = 1.05;
    }
  }

  function animate() {
    time++;
    ctx.clearRect(0, 0, w, h);

    // Caustic light ripples (behind waves)
    drawCaustics(time * 0.016);

    // Draw wave layers back to front
    for (var i = 0; i < waves.length; i++) {
      drawWave(waves[i], time);
    }

    // Floating motes on top
    drawMotes(time * 0.016);

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
});
