// ===== Hotspot images mapping =====
const HOTSPOT_IMAGES = {
  'cong-tam-quan':   'images/hotspots/cong-tam-quan.png',
  'san-dinh':        'images/hotspots/san-dinh.png',
  'tien-dien':       'images/hotspots/tien-dien.png',
  'chanh-dien':      'images/hotspots/chanh-dien.png',
  'hau-dien':        'images/hotspots/hau-dien.png',
  'nha-vo-ca':       'images/hotspots/nha-vo-ca.png',
  'cot-keo-go':      'images/hotspots/chanh-dien.png',
  'bo-noc-mai-ngoi': 'images/hotspots/tien-dien.png',
};

// ===== Hotspot Modal =====
const HotspotModal = {
  currentArea: null,
  modalEl: null,
  audioEl: null,
  isPlaying: false,

  init() {
    this.modalEl = document.getElementById('hotspot-modal');
    this.audioEl = document.getElementById('hotspot-audio');
    if (!this.modalEl) return;

    // Close handlers
    document.getElementById('hotspot-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('.hotspot-modal-overlay')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Tab handlers
    this.modalEl.querySelectorAll('.hotspot-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const lang = tab.dataset.lang;
        if (lang && this.currentArea) {
          // Update active tab
          this.modalEl.querySelectorAll('.hotspot-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          // Update content
          const data = this.currentArea[lang];
          if (data) {
            document.getElementById('hotspot-modal-title').textContent = data.name;
            document.getElementById('hotspot-modal-desc').textContent = data.desc;
            document.getElementById('hotspot-audio-name').textContent = 'Audio Guide: ' + data.name;
          }
        }
      });
    });

    // Audio play
    document.getElementById('hotspot-audio-play')?.addEventListener('click', () => {
      this.toggleAudio();
    });

    // Expose globally for Three.js module
    window.openHotspotModal = (area) => this.open(area);
  },

  open(area) {
    if (!this.modalEl || !area) return;
    this.currentArea = area;

    const lang = i18n.current;
    const data = area[lang];

    // Set image
    const imgSrc = HOTSPOT_IMAGES[area.id] || 'images/hotspots/cong-tam-quan.png';
    document.getElementById('hotspot-modal-img').src = imgSrc;
    document.getElementById('hotspot-modal-img').alt = data.name;

    // Set content
    document.getElementById('hotspot-modal-title').textContent = data.name;
    document.getElementById('hotspot-modal-desc').textContent = data.desc;
    document.getElementById('hotspot-audio-name').textContent = 'Audio Guide: ' + data.name;
    document.getElementById('hotspot-audio-dur').textContent = 'Thời lượng: 02:18';

    // Set audio source
    if (this.audioEl) {
      this.audioEl.src = data.audio || '';
    }

    // Update active tab
    this.modalEl.querySelectorAll('.hotspot-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lang === lang);
    });

    // Show modal
    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
    document.body.style.overflow = '';

    // Stop audio
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.isPlaying = false;
    const playBtn = document.getElementById('hotspot-audio-play');
    if (playBtn) playBtn.textContent = '▶';
  },

  toggleAudio() {
    if (!this.audioEl) return;
    const playBtn = document.getElementById('hotspot-audio-play');

    if (this.isPlaying) {
      this.audioEl.pause();
      this.isPlaying = false;
      if (playBtn) playBtn.textContent = '▶';
    } else {
      this.audioEl.play().catch(() => {
        // No audio file — simulate
        this.simulateAudio();
      });
      this.isPlaying = true;
      if (playBtn) playBtn.textContent = '⏸';
    }
  },

  simulateAudio() {
    let t = 0;
    const dur = 45;
    const playBtn = document.getElementById('hotspot-audio-play');
    const interval = setInterval(() => {
      t++;
      if (t >= dur || !this.isPlaying || !this.modalEl.classList.contains('open')) {
        clearInterval(interval);
        this.isPlaying = false;
        if (playBtn) playBtn.textContent = '▶';
        return;
      }
    }, 1000);
  }
};

// ===== Language Tabs (History section) =====
const LangTabs = {
  init() {
    document.querySelectorAll('.lang-tabs .lang-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const lang = tab.dataset.lang;
        if (lang) {
          i18n.set(lang);
          // Update active tabs
          document.querySelectorAll('.lang-tabs .lang-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          // Also sync hotspot modal tabs
          document.querySelectorAll('.hotspot-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.lang === lang);
          });
        }
      });
    });
  }
};

// ===== Timeline =====
const Timeline = {
  init() {
    this.render();
    document.addEventListener('langchange', () => this.render());
  },
  render() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    const lang = i18n.current;
    container.innerHTML = MAP_DATA.timeline.map((item, i) => `
      <div class="timeline-item" style="animation-delay:${i*0.1}s">
        <div class="timeline-year">${item.year}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p>${item[lang]}</p>
        </div>
      </div>
    `).join('');
    const items = container.querySelectorAll('.timeline-item');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.2 });
    items.forEach(el => obs.observe(el));
  }
};

// ===== Main App =====
const App = {
  init() {
    i18n.init();
    HotspotModal.init();
    LangTabs.init();
    Timeline.init();
    this.initNav();
    this.initScrollReveal();
  },

  initNav() {
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
      const header = document.getElementById('header');
      if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    });
  },

  initScrollReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
