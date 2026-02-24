/* ===================================================
   La Biblioteca Gamer — Main JS v3
   RAWG API · Wishlist · Game Popup · Affiliate · TikTok
   =================================================== */

// ---- Config ----
const RAWG = {
  KEY: 'f5ed341cd9f6487182ae5e4b62d42fd8',
  BASE: 'https://api.rawg.io/api',
  CACHE_TTL: 30 * 60 * 1000,

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
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (err) {
      console.error('RAWG:', err);
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
    try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { }
  }
};

const AFFILIATE_URL = 'https://www.instant-gaming.com/?igr=gamer-3047d00';

// ---- Wishlist (localStorage) ----
const Wishlist = {
  KEY: 'bibgamer_wishlist',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; }
  },

  has(id) {
    return this.getAll().some(g => g.id === id);
  },

  toggle(game) {
    let list = this.getAll();
    const idx = list.findIndex(g => g.id === game.id);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push({
        id: game.id,
        name: game.name,
        background_image: game.background_image,
        metacritic: game.metacritic,
        genres: game.genres,
        parent_platforms: game.parent_platforms
      });
    }
    localStorage.setItem(this.KEY, JSON.stringify(list));
    updateWishlistCounters();
    return idx === -1; // returns true if added
  },

  count() { return this.getAll().length; }
};

function updateWishlistCounters() {
  document.querySelectorAll('.wishlist-count').forEach(el => {
    const c = Wishlist.count();
    el.textContent = c;
    el.style.display = c > 0 ? 'flex' : 'none';
  });
}

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
  return platforms.map(p => map[p.platform.slug] || p.platform.name).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
}

const heartSVG = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card fade-in visible';
  card.dataset.gameId = game.id;
  const mc = game.metacritic;
  const img = game.background_image || '';
  const rating = mc ? `<span class="rating-badge ${ratingColor(mc)}">${mc}</span>` : '';
  const genres = game.genres ? game.genres.map(g => `<span>${g.name}</span>`).join('') : '';
  const plats = platformNames(game.parent_platforms || []);
  const wishlisted = Wishlist.has(game.id);

  card.innerHTML = `
    <div class="game-card-img" style="background-image:url('${img}')">
      ${rating}
      <button class="wishlist-btn${wishlisted ? ' active' : ''}" data-game-id="${game.id}" aria-label="Añadir a deseados" title="Lista de deseados">
        ${heartSVG}
      </button>
    </div>
    <div class="game-card-body">
      <h3>${game.name}</h3>
      <div class="game-genres">${genres}</div>
      <span class="game-platforms-text">${plats}</span>
    </div>
  `;

  // Click card => open popup
  card.addEventListener('click', (e) => {
    if (e.target.closest('.wishlist-btn')) return;
    openGameModal(game.id);
  });

  // Wishlist button
  const wBtn = card.querySelector('.wishlist-btn');
  wBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const added = Wishlist.toggle(game);
    wBtn.classList.toggle('active', added);
    // Update all cards with same game
    document.querySelectorAll(`.wishlist-btn[data-game-id="${game.id}"]`).forEach(b => {
      b.classList.toggle('active', Wishlist.has(game.id));
    });
  });

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

// ---- Game Detail Modal ----
async function openGameModal(gameId) {
  let overlay = document.getElementById('game-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'game-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal"><div class="spinner"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeGameModal();
    });
  }

  const modal = overlay.querySelector('.modal');
  modal.innerHTML = '<div class="spinner"></div>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const game = await RAWG.fetch(`/games/${gameId}`);
  if (!game) {
    modal.innerHTML = '<div class="modal-body"><h2>Error al cargar</h2><p>No pudimos cargar los detalles del juego.</p></div>';
    return;
  }

  const mc = game.metacritic;
  const img = game.background_image || '';
  const genres = game.genres ? game.genres.map(g => `<span class="genre-pill">${g.name}</span>`).join('') : '';
  const plats = platformNames(game.parent_platforms || []);
  const rating = mc ? `<span class="rating-badge ${ratingColor(mc)}">${mc}</span>` : '';
  const wishlisted = Wishlist.has(game.id);

  // Clean description HTML
  let desc = game.description || game.description_raw || 'Sin descripción disponible.';

  // Screenshots
  const screenshots = game.short_screenshots || [];
  let screenshotsHTML = '';
  if (screenshots.length > 0) {
    screenshotsHTML = `
      <div class="modal-screenshots">
        <h3>Capturas</h3>
        <div class="modal-screenshots-row">
          ${screenshots.map(s => `<img src="${s.image}" alt="Captura de ${game.name}" loading="lazy">`).join('')}
        </div>
      </div>
    `;
  }

  // Info grid
  const released = game.released ? new Date(game.released).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA';
  const devs = game.developers ? game.developers.map(d => d.name).join(', ') : '—';
  const publishers = game.publishers ? game.publishers.map(p => p.name).join(', ') : '—';
  const esrb = game.esrb_rating ? game.esrb_rating.name : '—';
  const playtime = game.playtime ? `${game.playtime} horas` : '—';
  const ratingScore = game.rating ? `${game.rating} / 5` : '—';

  modal.innerHTML = `
    <button class="modal-close" aria-label="Cerrar">✕</button>
    <div class="modal-hero" style="background-image:url('${img}')"></div>
    <div class="modal-body">
      <h2>${game.name}</h2>
      <div class="modal-meta">
        ${rating}
        ${genres}
      </div>

      ${screenshotsHTML}

      <div class="modal-desc">${desc}</div>

      <div class="modal-info-grid">
        <div class="modal-info-item"><label>Lanzamiento</label><span>${released}</span></div>
        <div class="modal-info-item"><label>Plataformas</label><span>${plats}</span></div>
        <div class="modal-info-item"><label>Desarrollador</label><span>${devs}</span></div>
        <div class="modal-info-item"><label>Publisher</label><span>${publishers}</span></div>
        <div class="modal-info-item"><label>Clasificación</label><span>${esrb}</span></div>
        <div class="modal-info-item"><label>Tiempo de juego</label><span>${playtime}</span></div>
        <div class="modal-info-item"><label>Puntuación</label><span>${ratingScore}</span></div>
        <div class="modal-info-item"><label>Metacritic</label><span>${mc || '—'}</span></div>
      </div>

      <div class="modal-actions">
        <a href="${AFFILIATE_URL}" target="_blank" rel="noopener" class="btn btn-buy">
          🛒 Comprar en Instant Gaming
        </a>
        <button class="btn btn-outline wishlist-modal-btn${wishlisted ? ' active' : ''}" data-game-id="${game.id}">
          ${wishlisted ? '❤️ En tu lista' : '🤍 Añadir a deseados'}
        </button>
      </div>
    </div>
  `;

  // Close button
  modal.querySelector('.modal-close').addEventListener('click', closeGameModal);

  // Wishlist button in modal
  const wBtn = modal.querySelector('.wishlist-modal-btn');
  wBtn.addEventListener('click', () => {
    const added = Wishlist.toggle(game);
    wBtn.classList.toggle('active', added);
    wBtn.innerHTML = added ? '❤️ En tu lista' : '🤍 Añadir a deseados';
    // Sync card heart buttons
    document.querySelectorAll(`.wishlist-btn[data-game-id="${game.id}"]`).forEach(b => {
      b.classList.toggle('active', Wishlist.has(game.id));
    });
  });

  // ESC to close
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeGameModal(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

function closeGameModal() {
  const overlay = document.getElementById('game-modal');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ================================================================
//  DOMContentLoaded — Init everything
// ================================================================
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

  // Newsletter form — redirect to Substack
  const nlForm = document.getElementById('newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', e => {
      e.preventDefault();
      window.open('https://bibliotecagamer.substack.com/subscribe', '_blank');
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

  // Init wishlist counters
  updateWishlistCounters();

  // ---- HOMEPAGE ----
  initHeroCarousel();
  initHomeRows();

  // ---- BIBLIOTECA ----
  initBiblioteca();

  // ---- DESEADOS PAGE ----
  initWishlistPage();
});

// ================================================================
//  HOMEPAGE — Hero Carousel
// ================================================================
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
    slide.style.cursor = 'pointer';
    slide.innerHTML = `
      <div class="hero-slide-content">
        <h2>${game.name}</h2>
        <div class="hero-meta">
          ${mc ? `<span class="rating-badge ${ratingColor(mc)}">${mc}</span>` : ''}
          ${genres}
        </div>
        <span style="font-size:.78rem;color:rgba(255,255,255,.5)">${plats}</span>
      </div>
    `;
    slide.addEventListener('click', () => openGameModal(game.id));
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

  const prevBtn = document.getElementById('hero-prev');
  const nextBtn = document.getElementById('hero-next');
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide((current - 1 + games.length) % games.length));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide((current + 1) % games.length));

  let autoInterval = setInterval(() => goToSlide((current + 1) % games.length), 5000);
  const carousel = slidesContainer.closest('.hero-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => clearInterval(autoInterval));
    carousel.addEventListener('mouseleave', () => {
      autoInterval = setInterval(() => goToSlide((current + 1) % games.length), 5000);
    });
  }
}

// ================================================================
//  HOMEPAGE — Scroll Rows
// ================================================================
async function initHomeRows() {
  await loadRow('row-top-rated', { ordering: '-rating', page_size: 15, metacritic: '80,100' });
  await loadRow('row-new-releases', { ordering: '-released', page_size: 15, dates: `${daysAgo(90)},${today()}` });
  await loadRow('row-action', { genres: 'action', ordering: '-rating', page_size: 15, metacritic: '75,100' });
  await loadRow('row-rpg', { genres: 'role-playing-games-rpg', ordering: '-rating', page_size: 15, metacritic: '75,100' });
  await loadRow('row-indie', { genres: 'indie', ordering: '-rating', page_size: 15, metacritic: '75,100' });
}

async function loadRow(containerId, params) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const data = await RAWG.fetch('/games', params);
  if (data && data.results) {
    data.results.forEach(game => container.appendChild(createGameCard(game)));
  }
}

function today() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().split('T')[0]; }

// ================================================================
//  BIBLIOTECA — Dynamic Grid
// ================================================================
let bibPage = 1, bibGenre = '', bibSearch = '', bibNextUrl = null, bibLoading = false;

async function initBiblioteca() {
  const grid = document.getElementById('games-grid');
  const loadMoreBtn = document.getElementById('load-more');
  const searchInput = document.getElementById('search-input');
  const filtersContainer = document.getElementById('filters-container');
  if (!grid) return;

  if (filtersContainer) {
    const genresData = await RAWG.fetch('/genres', { page_size: 20 });
    if (genresData && genresData.results) {
      genresData.results.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.genre = genre.slug;
        btn.textContent = genre.name;
        btn.addEventListener('click', () => {
          filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          bibGenre = genre.slug;
          bibPage = 1; bibNextUrl = null;
          loadGames(true);
        });
        filtersContainer.appendChild(btn);
      });
    }
    const allBtn = filtersContainer.querySelector('[data-genre=""]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        bibGenre = ''; bibPage = 1; bibNextUrl = null;
        loadGames(true);
      });
    }
  }

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        bibSearch = searchInput.value.trim();
        bibPage = 1; bibNextUrl = null;
        loadGames(true);
      }, 350);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (!bibLoading && bibNextUrl) { bibPage++; loadGames(false); }
    });
  }

  loadGames(true);
}

async function loadGames(reset) {
  const grid = document.getElementById('games-grid');
  const loadMoreBtn = document.getElementById('load-more');
  const noResults = document.getElementById('no-results');
  if (!grid) return;

  bibLoading = true;
  if (loadMoreBtn) loadMoreBtn.disabled = true;
  if (reset) { grid.innerHTML = ''; createSkeletons(10, grid); }

  const params = { page: bibPage, page_size: 20, ordering: '-rating' };
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
    if (reset && noResults) noResults.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }
  bibLoading = false;
}

// ================================================================
//  DESEADOS — Wishlist Page
// ================================================================
function initWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  if (!grid) return;

  const games = Wishlist.getAll();

  if (games.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  games.forEach(game => {
    const card = createGameCard(game);
    // Re-bind wishlist to also remove from grid on toggle off
    const wBtn = card.querySelector('.wishlist-btn');
    const originalHandler = wBtn.onclick;
    wBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // If removed from wishlist, remove card from grid
      if (Wishlist.has(game.id)) {
        Wishlist.toggle(game);
        card.style.transition = 'opacity .3s, transform .3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
          card.remove();
          if (Wishlist.count() === 0 && empty) empty.style.display = 'block';
        }, 300);
      }
    }, { once: true });
    grid.appendChild(card);
  });
}
