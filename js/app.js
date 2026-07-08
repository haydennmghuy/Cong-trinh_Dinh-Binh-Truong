const HOTSPOT_IMAGES = {
  'cong-tam-quan':        ['images/real/cong_tam_quan_real.png', 'images/gallery/gallery-5.jpg'],
  'nha-vo-ca':            ['images/real/outside_real.png', 'images/gallery/gallery-7.jpg'],
  'tien-dien':            ['images/real/outside_real.png', 'images/gallery/gallery-7.jpg'],
  'chanh-dien':           ['images/real/inside_real.png', 'images/gallery/gallery-8.png'],
  'nha-hoi':              ['images/real/outside_real.png', 'images/gallery/gallery-9.jpg'],
  'ho-thuy-ta':           ['images/real/outside_real.png', 'images/gallery/gallery-9.jpg'],
  'san-khau-ngoai-troi':  ['images/real/outside_real.png', 'images/gallery/gallery-7.jpg'],
  'bia-tuong-niem':       ['images/real/bia_tuong_niem_real.jpg', 'images/gallery/gallery-5.jpg'],
  'bia-di-tich':          ['images/real/cong_tam_quan_real.png', 'images/gallery/gallery-5.jpg'],
  'mieu-tho-1':           ['images/real/mieu_tho_real.jpg', 'images/gallery/gallery-6.png'],
  'binh-phong':           ['images/real/binh_phong_real.jpg', 'images/gallery/gallery-6.png'],
  'mieu-tho-2':           ['images/real/mieu_tho_real.jpg', 'images/gallery/gallery-6.png'],
};

// ===== Hotspot Modal =====
const HotspotModal = {
  currentArea: null,
  modalEl: null,

  init() {
    this.modalEl = document.getElementById('hotspot-modal');
    if (!this.modalEl) return;

    // Close handlers
    document.getElementById('hotspot-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('.hotspot-modal-overlay')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Listen to global language changes
    document.addEventListener('langchange', () => {
      if (this.currentArea && this.modalEl.classList.contains('open')) {
        this.updateContent();
      }
    });

    // Expose globally for Three.js module
    window.openHotspotModal = (area) => this.open(area);
  },

  updateContent() {
    if (!this.currentArea) return;
    const lang = i18n.current;
    const data = this.currentArea[lang];
    if (!data) return;

    // Set main image (Avatar)
    const imgs = HOTSPOT_IMAGES[this.currentArea.id] || ['images/gallery/gallery-5.jpg'];
    document.getElementById('hotspot-modal-img').src = imgs[0];
    document.getElementById('hotspot-modal-img').alt = data.name;

    // Set text contents
    document.getElementById('hotspot-modal-title').textContent = data.name;
    document.getElementById('hotspot-modal-desc').textContent = data.desc;

    // Set architectural detail content (directly visible)
    const detailBox = document.getElementById('hotspot-modal-detail-box');
    if (detailBox) {
      detailBox.textContent = data.details || (lang === 'vi' ? 'Chưa có chi tiết kiến trúc bổ sung.' : 'No additional architectural details available.');
    }

    // Set architectural images grid
    const imgGrid = document.getElementById('hotspot-modal-images-grid');
    if (imgGrid) {
      imgGrid.innerHTML = imgs.map((src, idx) => `
        <div class="hotspot-grid-img-wrap">
          <img src="${src}" alt="${data.name} ${idx + 1}" loading="lazy" />
        </div>
      `).join('');
    }
  },

  open(area) {
    if (!this.modalEl || !area) return;
    this.currentArea = area;
    this.updateContent();

    // Show modal
    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
    document.body.style.overflow = '';
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
