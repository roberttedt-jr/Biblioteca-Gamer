/* ===================================================
   La Biblioteca Gamer — Main JS v2
   RAWG API · Caching · Carousels · Dynamic Library
   =================================================== */

// ---- RAWG API Config ----
const RAWG = {
  KEY: 'f5ed341cd9f6487182ae5e4b62d42fd8',
  BASE: 'https://api.rawg.io/api',
  CACHE_TTL: 30 * 60 * 1000, // 30 min

  url(endpoint, params = {}) {
    const url = new URL(`${this.BASE}${endpoint}`);
    url.searchParams.set('key', this.KEY);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url.toString();
  },

  async fetch(endpoint, params = {}) {
    const cacheKey = `rawg_${endpoint}_${JSON.stringify(params)}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(this.url(endpoint, params));
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (err) {
      console.error('RAWG fetch error:', err);
      return null;
    }
  },

  getCache(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const { data, ts } = JSON.parse(item);
      if (Date.now() - ts > this.CACHE_TTL) { localStorage.removeItem(key); return null; }
      return data;
    } catch { return null; }
  },

  setCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); }
    catch { /* storage full, ignore */ }
  }
};

// ---- Helpers ----
function ratingColor(score) {
  if (!score || score === 0) return 'none';
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function platformNames(platforms) {
  if (!platforms) return '';
  const map = { pc: 'PC', playstation: 'PlayStation', xbox: 'Xbox', nintendo: 'Nintendo', mac: 'Mac', linux: 'Linux', ios: 'iOS', android: 'Android' };
  return (platforms.map(p => map[p.platform.slug] || p.platform.name).filter((v, i, a) => a.indexOf(v) === i)).join(' · ');
}

function genreNames(genres) {
  if (!genres) return '';
  return genres.map(g => g.name).join(' · ');
}

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card fade-in visible';
  const mc = game.metacritic;
  const img = game.background_image || '';
  const rating = mc ? `<span class="rating-badge ${ratingColor(mc)}">${mc}</span>` : '';
  const genres = game.genres ? game.genres.map(g => `<span>${g.name}</span>`).join('') : '';
  const plats = platformNames(game.parent_platforms || []);

  card.innerHTML = `
    <div class="game-card-img" style="background-image:url('${img}')">
      ${rating}
    </div>
    <div class="game-card-body">
      <h3>${game.name}</h3>
      <div class="game-genres">${genres}</div>
      <span class="game-platforms-text">${plats}</span>
    </div>
  `;
  return card;
}

function createSkeletons(count, container) {
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton-card';
    container.appendChild(sk);
  }
}

function clearSkeletons(container) {
  container.querySelectorAll('.skeleton').forEach(s => s.remove());
}

// ---- Mobile Menu ----
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Header scroll shadow
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Fade-in observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Active nav link
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) link.classList.add('active');
  });

  // Smooth scroll anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Newsletter form
  const nlForm = document.getElementById('newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', e => {
      e.preventDefault();
      alert('¡Gracias por suscribirte! Pronto recibirás las mejores recomendaciones.');
      nlForm.reset();
    });
  }

  // Contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = contactForm.querySelector('#contact-name').value;
      const email = contactForm.querySelector('#contact-email').value;
      const msg = contactForm.querySelector('#contact-message').value;
      const subj = encodeURIComponent('Contacto - La Biblioteca Gamer');
      const body = encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${msg}`);
      window.location.href = `mailto:tu@email.com?subject=${subj}&body=${body}`;
    });
  }

  // ---- HOMEPAGE: Carousel + Rows ----
  initHeroCarousel();
  initHomeRows();

  // ---- BIBLIOTECA: Dynamic grid ----
  initBiblioteca();
});

// ========================================================
//  HOMEPAGE — Hero Carousel
// ========================================================
async function initHeroCarousel() {
  const slidesContainer = document.getElementById('hero-slides');
  const dotsContainer = document.getElementById('hero-dots');
  if (!slidesContainer || !dotsContainer) return;

  const data = await RAWG.fetch('/games', { ordering: '-metacritic', page_size: 6 });
  if (!data || !data.results) return;

  const games = data.results.filter(g => g.background_image);
  let current = 0;

  games.forEach((game, i) => {
    const mc = game.metacritic;
    const genres = game.genres ? game.genres.map(g => `<span class="genre-pill">${g.name}</span>`).join('') : '';
    const plats = platformNames(game.parent_platforms || []);

    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.style.backgroundImage = `url('${game.background_image}')`;
    slide.innerHTML = `
      <div class="hero-slide-content">
        <h2>${game.name}</h2>
        <div class="hero-meta">
          ${mc ? `<span class="rating-badge ${ratingColor(mc)}">${mc}</span>` : ''}
          ${genres}
        </div>
        <span class="platform-text" style="font-size:.78rem;color:rgba(255,255,255,.5)">${plats}</span>
      </div>
    `;
    slidesContainer.appendChild(slide);

    const dot = document.createElement('button');
    dot.className = `hero-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Ir a ${game.name}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  function goToSlide(idx) {
    current = idx;
    slidesContainer.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  // Arrow controls
  const prevBtn = document.getElementById('hero-prev');
  const nextBtn = document.getElementById('hero-next');
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide((current - 1 + games.length) % games.length));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide((current + 1) % games.length));

  // Auto-advance
  let autoInterval = setInterval(() => goToSlide((current + 1) % games.length), 5000);
  slidesContainer.closest('.hero-carousel')?.addEventListener('mouseenter', () => clearInterval(autoInterval));
  slidesContainer.closest('.hero-carousel')?.addEventListener('mouseleave', () => {
    autoInterval = setInterval(() => goToSlide((current + 1) % games.length), 5000);
  });
}

// ========================================================
//  HOMEPAGE — Scroll Rows
// ========================================================
async function initHomeRows() {
  // Top rated row
  const topRatedRow = document.getElementById('row-top-rated');
  if (topRatedRow) {
    const data = await RAWG.fetch('/games', { ordering: '-rating', page_size: 15, metacritic: '80,100' });
    if (data && data.results) {
      data.results.forEach(game => topRatedRow.appendChild(createGameCard(game)));
    }
  }

  // New releases row  
  const newReleasesRow = document.getElementById('row-new-releases');
  if (newReleasesRow) {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const data = await RAWG.fetch('/games', { ordering: '-released', page_size: 15, dates: `${past},${today}` });
    if (data && data.results) {
      data.results.forEach(game => newReleasesRow.appendChild(createGameCard(game)));
    }
  }

  // Action row
  const actionRow = document.getElementById('row-action');
  if (actionRow) {
    const data = await RAWG.fetch('/games', { genres: 'action', ordering: '-rating', page_size: 15, metacritic: '75,100' });
    if (data && data.results) {
      data.results.forEach(game => actionRow.appendChild(createGameCard(game)));
    }
  }

  // RPG row
  const rpgRow = document.getElementById('row-rpg');
  if (rpgRow) {
    const data = await RAWG.fetch('/games', { genres: 'role-playing-games-rpg', ordering: '-rating', page_size: 15, metacritic: '75,100' });
    if (data && data.results) {
      data.results.forEach(game => rpgRow.appendChild(createGameCard(game)));
    }
  }

  // Indie row
  const indieRow = document.getElementById('row-indie');
  if (indieRow) {
    const data = await RAWG.fetch('/games', { genres: 'indie', ordering: '-rating', page_size: 15, metacritic: '75,100' });
    if (data && data.results) {
      data.results.forEach(game => indieRow.appendChild(createGameCard(game)));
    }
  }
}

// ========================================================
//  BIBLIOTECA — Dynamic Grid with Filters & Search
// ========================================================
let bibPage = 1;
let bibGenre = '';
let bibSearch = '';
let bibNextUrl = null;
let bibLoading = false;

async function initBiblioteca() {
  const grid = document.getElementById('games-grid');
  const loadMoreBtn = document.getElementById('load-more');
  const searchInput = document.getElementById('search-input');
  const filtersContainer = document.getElementById('filters-container');
  if (!grid) return;

  // Load genre filters from API
  if (filtersContainer) {
    const genresData = await RAWG.fetch('/genres', { page_size: 20 });
    if (genresData && genresData.results) {
      // "All" button already in HTML
      genresData.results.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.genre = genre.slug;
        btn.textContent = genre.name;
        btn.addEventListener('click', () => {
          filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          bibGenre = genre.slug;
          bibPage = 1;
          bibNextUrl = null;
          loadGames(true);
        });
        filtersContainer.appendChild(btn);
      });
    }

    // "All" button handler
    const allBtn = filtersContainer.querySelector('[data-genre=""]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        bibGenre = '';
        bibPage = 1;
        bibNextUrl = null;
        loadGames(true);
      });
    }
  }

  // Search with debounce
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        bibSearch = searchInput.value.trim();
        bibPage = 1;
        bibNextUrl = null;
        loadGames(true);
      }, 350);
    });
  }

  // Load more
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (!bibLoading && bibNextUrl) {
        bibPage++;
        loadGames(false);
      }
    });
  }

  // Initial load
  loadGames(true);
}

async function loadGames(reset) {
  const grid = document.getElementById('games-grid');
  const loadMoreBtn = document.getElementById('load-more');
  const noResults = document.getElementById('no-results');
  if (!grid) return;

  bibLoading = true;
  if (loadMoreBtn) loadMoreBtn.disabled = true;

  if (reset) {
    grid.innerHTML = '';
    createSkeletons(10, grid);
  }

  const params = {
    page: bibPage,
    page_size: 20,
    ordering: '-rating',
  };
  if (bibGenre) params.genres = bibGenre;
  if (bibSearch) params.search = bibSearch;

  const data = await RAWG.fetch('/games', params);

  if (reset) clearSkeletons(grid);

  if (data && data.results && data.results.length > 0) {
    data.results.forEach(game => grid.appendChild(createGameCard(game)));
    bibNextUrl = data.next;
    if (noResults) noResults.style.display = 'none';
    if (loadMoreBtn) {
      loadMoreBtn.style.display = bibNextUrl ? 'block' : 'none';
      loadMoreBtn.disabled = false;
    }
  } else {
    if (reset) {
      if (noResults) noResults.style.display = 'block';
    }
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }

  bibLoading = false;
}
