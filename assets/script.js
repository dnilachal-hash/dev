/* RDKHMCH — site interactions */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Theme toggle ---------------- */
  const themeToggle = $('#themeToggle');
  const root = document.documentElement;
  const STORAGE_KEY = 'rdkhmch-theme';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    applyTheme(stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }

  themeToggle && themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  /* ---------------- Mobile nav ---------------- */
  const menuToggle = $('#menuToggle');
  const nav = $('#primaryNav');

  menuToggle && menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // close mobile nav after click
  nav && $$('a', nav).forEach((a) => {
    a.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------------- Sticky header shadow ---------------- */
  const header = $('#siteHeader');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------------- Stat counters ---------------- */
  const counters = $$('.stat__num[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10) || 0;
          const suffix = el.textContent.replace(/[\d,]/g, '') || '';
          const dur = 1400;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          co.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => co.observe(c));
  }

  /* ---------------- Notice filter ---------------- */
  const chips = $$('.chip');
  const notices = $$('#noticeList .notice');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      chips.forEach((c) => {
        c.classList.toggle('chip--active', c === chip);
        c.setAttribute('aria-selected', String(c === chip));
      });
      notices.forEach((n) => {
        const show = filter === 'all' || n.dataset.cat === filter;
        n.classList.toggle('hide', !show);
      });
    });
  });

  /* ---------------- Testimonial carousel ---------------- */
  const track = $('#testiTrack');
  const cards = track ? $$('.t-card', track) : [];
  const dotsHost = $('#tDots');
  const prevBtn = $('#tPrev');
  const nextBtn = $('#tNext');
  let idx = 0;
  let timer = null;

  function update() {
    if (!track) return;
    track.style.transform = `translateX(-${idx * 100}%)`;
    cards.forEach((c, i) => c.setAttribute('aria-hidden', String(i !== idx)));
    if (dotsHost) {
      $$('.t-dot', dotsHost).forEach((d, i) => {
        d.classList.toggle('is-active', i === idx);
        d.setAttribute('aria-selected', String(i === idx));
      });
    }
  }

  function go(n) {
    idx = (n + cards.length) % cards.length;
    update();
  }

  if (track && cards.length) {
    if (dotsHost) {
      cards.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 't-dot' + (i === 0 ? ' is-active' : '');
        d.type = 'button';
        d.setAttribute('aria-label', `Show testimonial ${i + 1}`);
        d.setAttribute('role', 'tab');
        d.addEventListener('click', () => { go(i); restart(); });
        dotsHost.appendChild(d);
      });
    }
    prevBtn && prevBtn.addEventListener('click', () => { go(idx - 1); restart(); });
    nextBtn && nextBtn.addEventListener('click', () => { go(idx + 1); restart(); });

    function start() { if (!reduced) timer = setInterval(() => go(idx + 1), 6500); }
    function stop() { if (timer) clearInterval(timer); }
    function restart() { stop(); start(); }

    const carousel = $('#testiCarousel');
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);
    update();
    start();
  }

  /* ---------------- Inquiry form (UI only) ---------------- */
  const form = $('#inquiryForm');
  const status = $('#formStatus');
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = 'Please fill all required fields correctly.';
      status.style.color = 'var(--accent-strong)';
      form.reportValidity();
      return;
    }
    status.style.color = '';
    status.textContent = 'Thank you. Our admission office will get back to you shortly.';
    form.reset();
  });

  /* ---------------- Footer year ---------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
