const navLinks = document.querySelectorAll('.topnav a');
const sections = ['home', 'projects', 'experience', 'tools', 'thoughts', 'contact'];

function setActiveNav() {
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 200) current = id;
  });
  navLinks.forEach(a => {
    a.classList.remove('active');
    const href = a.getAttribute('href').replace('#', '');
    if (href === current) a.classList.add('active');
  });
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

window.addEventListener('scroll', setActiveNav, { passive: true });
setActiveNav();

const form = document.getElementById('cForm');
const msg = document.getElementById('successMsg');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.submit-btn');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    setTimeout(() => {
      msg.style.display = 'block';
      form.reset();
      btn.textContent = 'Submit';
      btn.disabled = false;
      setTimeout(() => msg.style.display = 'none', 4000);
    }, 1000);
  });
}

function animateStats() {
  document.querySelectorAll('.stat-n').forEach(el => {
    const txt = el.textContent;
    const num = parseInt(txt.replace(/\D/g, ''));
    let start = 0;
    const duration = 1500;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = '+' + Math.round(eased * num);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

const statsObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) { animateStats(); statsObs.disconnect(); }
}, { threshold: 0.5 });
const statsEl = document.querySelector('.stats-row');
if (statsEl) statsObs.observe(statsEl);

document.querySelectorAll('.list-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    item.style.paddingLeft = '6px';
    item.style.transition = 'padding .2s';
  });
  item.addEventListener('mouseleave', () => {
    item.style.paddingLeft = '0';
  });
});
