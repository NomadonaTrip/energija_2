/* =====================================================
   ENERGIJA — interactions
   - scroll progress + sticky header
   - reveal-on-scroll (IntersectionObserver)
   - animated counters
   - FAQ accordion
   - magnetic buttons
   - custom cursor (pointer-fine only)
   - hero load class
   ===================================================== */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- 1. Hero load class for image easing-in --- */
  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('hero');
    requestAnimationFrame(() => hero && hero.classList.add('is-loaded'));
  });

  /* --- 2. Scroll progress + sticky header behavior --- */
  const header = document.getElementById('header');
  const progress = document.getElementById('progress');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;

    if (header) {
      // Hide on scroll-down past 200px, reveal on scroll-up
      if (y > 200 && y > lastY + 4) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 200) header.classList.remove('is-hidden');

      // Switch from red to ink after scrolling past hero
      if (y > 80) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* --- 3. Reveal on scroll --- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-mask');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => {
      // If the element is already in viewport on init, mark immediately
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* --- 4. Counters --- */
  const counters = document.querySelectorAll('[data-counter]');
  function runCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-expo
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const v = Math.round(target * e);
      el.textContent = v + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => cio.observe(c));
  } else {
    counters.forEach(c => { c.textContent = c.dataset.counter + (c.dataset.suffix || ''); });
  }

  /* --- 5. FAQ accordion --- */
  document.querySelectorAll('.faq__item').forEach(item => {
    const btn = item.querySelector('.faq__btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      // Close all others (single-open accordion)
      document.querySelectorAll('.faq__item.is-open').forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          other.querySelector('.faq__btn')?.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* --- 6. Magnetic buttons (subtle pull toward cursor) --- */
  if (isFinePointer && !reduceMotion) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      const strength = 0.18;
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* --- 7. Custom cursor --- */
  const cursor = document.getElementById('cursor');
  if (cursor && isFinePointer && !reduceMotion) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    let raf;
    function follow() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(follow);
    }
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) follow();
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup',   () => cursor.classList.remove('is-down'));

    const hoverSelector = 'a, button, [data-magnetic], .service, .why__card, .partner, .gallery__item, .faq__btn';
    document.querySelectorAll(hoverSelector).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* --- 8. Smooth anchor scroll with header offset --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({
        top,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  });
})();
