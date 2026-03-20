// ─── Scroll-based navbar ───
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

// ─── Scroll reveal ───
function initReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
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

// ─── Form handling ───
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

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  initReveal();
  setActiveNav();
});
