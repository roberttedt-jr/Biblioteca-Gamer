/* ===================================================
   La Biblioteca Gamer — Main JS
   Vanilla JS · No dependencies
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ---- Mobile Menu ----
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Sticky header shadow on scroll ----
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- Scroll fade-in animations ----
  const faders = document.querySelectorAll('.fade-in');
  if (faders.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    faders.forEach(el => observer.observe(el));
  }

  // ---- Biblioteca: Filters ----
  const filterBtns = document.querySelectorAll('.filter-btn');
  const gameCards = document.querySelectorAll('.game-card');
  const noResults = document.getElementById('no-results');
  const searchInput = document.getElementById('search-input');

  let activeFilter = 'todos';

  function applyFilters() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let visibleCount = 0;

    gameCards.forEach(card => {
      const tags = card.dataset.tags || '';
      const name = card.dataset.name || '';

      const matchesFilter = activeFilter === 'todos' || tags.includes(activeFilter);
      const matchesSearch = !query || name.includes(query);
      const show = matchesFilter && matchesSearch;

      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // ---- Newsletter form ----
  const nlForm = document.getElementById('newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Placeholder: integrate with Mailchimp, ConvertKit, etc.
      const email = nlForm.querySelector('input[type="email"]');
      const name = nlForm.querySelector('input[type="text"]');
      if (email && email.value) {
        alert('¡Gracias por suscribirte! Pronto recibirás las mejores recomendaciones.');
        nlForm.reset();
      }
    });
  }

  // ---- Contact form ----
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.querySelector('#contact-name').value;
      const email = contactForm.querySelector('#contact-email').value;
      const message = contactForm.querySelector('#contact-message').value;

      // Option A: mailto fallback
      const subject = encodeURIComponent('Contacto - La Biblioteca Gamer');
      const body = encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`);
      window.location.href = `mailto:tu@email.com?subject=${subject}&body=${body}`;

      // Option B: If using Formspree/Netlify Forms, uncomment below and add action to form:
      // contactForm.submit();
    });
  }

  // ---- Active nav link highlight ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
