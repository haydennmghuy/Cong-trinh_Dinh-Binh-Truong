const HOTSPOT_IMAGES = {
  'cong-tam-quan':        ['images/real/cong_tam_quan_real.png'],
  'cong-nho':             [],
  'nha-vo-ca':            [],
  'vo-qui':               [],
  'chanh-dien':           ['images/real/inside_real.png'],
  'tien-dien':            [],
  'ho-thuy-ta':           [],
  'bia-tuong-niem':       ['images/real/bia_tuong_niem_real.jpg'],
  'bia-di-tich':          [],
  'mieu-bach-ma':         ['images/real/mieu_tho_real.jpg'],
  'ban-than-nong':        ['images/real/binh_phong_real.jpg'],
  'mieu-ho':              [],
  'mieu-ba-ngu-hanh':     ['images/real/mieu_tho_real.jpg'],
  'cot-co':               [],
  'nha-tho-bac-ho':       [],
  'nha-bep':              [],
  'wc':                   [],
};

// ===== Hotspot Modal =====
// ===== Hotspot Modal =====
const HotspotModal = {
  currentArea: null,
  modalEl: null,
  audio: null,
  isPlaying: false,

  init() {
    this.modalEl = document.getElementById('hotspot-modal');
    if (!this.modalEl) return;

    this.audio = new Audio();
    this.audio.preload = 'none';

    // Close handlers
    document.getElementById('hotspot-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('.hotspot-modal-overlay')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Play/Pause button
    document.getElementById('hotspot-audio-play-btn')?.addEventListener('click', () => this.toggleAudio());

    // Seeking on progress track
    const trackBar = document.getElementById('hotspot-audio-track-bar');
    if (trackBar) {
      trackBar.addEventListener('click', (e) => this.seek(e));
    }

    // Audio events
    this.audio.addEventListener('timeupdate', () => {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;
      const timeEl = document.getElementById('hotspot-audio-time');
      const durEl = document.getElementById('hotspot-audio-duration');
      const progEl = document.getElementById('hotspot-audio-progress');

      if (timeEl) timeEl.textContent = this.formatTime(cur);
      if (durEl && dur > 0) durEl.textContent = this.formatTime(dur);
      if (progEl && dur > 0) {
        progEl.style.width = `${(cur / dur) * 100}%`;
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = this.audio.duration || 0;
      const durEl = document.getElementById('hotspot-audio-duration');
      if (durEl && dur > 0) durEl.textContent = this.formatTime(dur);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      const btn = document.getElementById('hotspot-audio-play-btn');
      if (btn) btn.textContent = '▶';
      this.audio.currentTime = 0;
    });

    // Listen to global language changes
    document.addEventListener('langchange', () => {
      if (this.currentArea && this.modalEl.classList.contains('open')) {
        const wasPlaying = this.isPlaying;
        this.audio.pause();
        this.isPlaying = false;
        const btn = document.getElementById('hotspot-audio-play-btn');
        if (btn) btn.textContent = '▶';

        this.updateContent();

        if (wasPlaying && this.audio.src) {
          this.toggleAudio();
        }
      }
    });

    // Expose globally for Three.js module
    window.openHotspotModal = (area) => this.open(area);
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  updateContent() {
    if (!this.currentArea) return;
    const lang = i18n.current;
    const data = this.currentArea[lang];
    if (!data) return;

    // Reset progress UI
    const timeEl = document.getElementById('hotspot-audio-time');
    const durEl = document.getElementById('hotspot-audio-duration');
    const progEl = document.getElementById('hotspot-audio-progress');
    if (timeEl) timeEl.textContent = '00:00';
    if (durEl) durEl.textContent = '00:00';
    if (progEl) progEl.style.width = '0%';

    // Set title label for audio
    const audioTitleEl = document.getElementById('hotspot-audio-title-lbl');
    if (audioTitleEl) {
      audioTitleEl.textContent = `${lang === 'vi' ? 'Thuyết minh' : 'Audio guide'}: ${data.name}`;
    }

    // Set audio source
    if (data.audio) {
      this.audio.src = data.audio;
      this.audio.load();
    } else {
      this.audio.src = '';
    }

    // Set main image (Avatar) or show placeholder
    const mainImgEl = document.getElementById('hotspot-modal-img');
    const placeholderEl = document.getElementById('hotspot-modal-img-placeholder');

    if (mainImgEl) {
      mainImgEl.classList.add('hidden');
    }
    if (placeholderEl) {
      placeholderEl.classList.remove('hidden');
    }

    // Set text contents
    document.getElementById('hotspot-modal-title').textContent = data.name;
    document.getElementById('hotspot-modal-desc').textContent = data.desc;

    // Set architectural detail content (directly visible)
    const detailBox = document.getElementById('hotspot-modal-detail-box');
    if (detailBox) {
      const detailsText = data.details || (lang === 'vi' ? 'Chưa có chi tiết kiến trúc bổ sung.' : 'No additional architectural details available.');
      detailBox.innerHTML = '';
      
      const listContainer = document.createElement('ul');
      listContainer.className = 'hotspot-details-list';
      
      detailsText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const listItem = document.createElement('li');
        listItem.className = 'hotspot-detail-item';
        
        if (trimmed.startsWith('+') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
          let cleanText = trimmed.substring(1).trim();
          const colonIdx = cleanText.indexOf(':');
          if (colonIdx !== -1) {
            const label = cleanText.substring(0, colonIdx + 1);
            const content = cleanText.substring(colonIdx + 1);
            
            const boldLabel = document.createElement('strong');
            boldLabel.className = 'hotspot-detail-label';
            boldLabel.textContent = label;
            
            listItem.appendChild(boldLabel);
            listItem.appendChild(document.createTextNode(content));
          } else {
            listItem.textContent = cleanText;
          }
        } else {
          listItem.textContent = trimmed;
        }
        listContainer.appendChild(listItem);
      });
      detailBox.appendChild(listContainer);
    }

    // Set architectural images grid or show placeholder
    const imgGrid = document.getElementById('hotspot-modal-images-grid');
    if (imgGrid) {
      imgGrid.innerHTML = `
        <div class="grid-placeholder-box">
          <span class="placeholder-icon">📸</span>
          <span class="placeholder-text">${lang === 'vi' ? 'Cần thêm ảnh' : 'Need photo'}</span>
        </div>
      `;
    }
  },

  toggleAudio() {
    if (!this.audio.src) return;
    const btn = document.getElementById('hotspot-audio-play-btn');

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      if (btn) btn.textContent = '▶';
    } else {
      if (btn) btn.textContent = '⌛';
      // Pause narration audio if playing
      if (window.NarrationAudio && window.NarrationAudio.isPlaying) {
        window.NarrationAudio.pause();
      }
      this.audio.play().then(() => {
        this.isPlaying = true;
        if (btn) btn.textContent = '❚❚';
      }).catch(err => {
        console.error("Hotspot audio play failed:", err);
        this.isPlaying = false;
        if (btn) btn.textContent = '▶';
      });
    }
  },

  seek(e) {
    const trackBar = document.getElementById('hotspot-audio-track-bar');
    if (!trackBar || !this.audio.duration) return;
    const rect = trackBar.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    this.audio.currentTime = pct * this.audio.duration;
  },

  open(area) {
    if (!this.modalEl || !area) return;
    this.currentArea = area;
    this.updateContent();

    // Show modal
    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus camera on the corresponding 3D spot
    if (window.Temple3D && typeof window.Temple3D.focusOnArea === 'function') {
      window.Temple3D.focusOnArea(area.id);
    }
  },

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
    document.body.style.overflow = '';

    // Stop audio playback
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    const btn = document.getElementById('hotspot-audio-play-btn');
    if (btn) btn.textContent = '▶';

    // Reset camera focus to main view
    if (window.Temple3D && typeof window.Temple3D.resetCamera === 'function') {
      window.Temple3D.resetCamera();
    }
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
    container.innerHTML = `
      <div class="timeline-spine" aria-hidden="true"></div>
      ${MAP_DATA.timeline.map((item, i) => {
        const sideClass = i % 2 === 0 ? 'is-left' : 'is-right';
        const langData = item[lang] || {};
        const mediaHtml = item.image ? 
          `<img src="${item.image}" alt="${langData.title || ''}" loading="lazy" decoding="async" onerror="this.parentElement.innerHTML='<div class=placeholder-image-box><span class=placeholder-icon>📸</span><span class=placeholder-text>${lang === 'vi' ? 'Cần thêm ảnh' : 'Need photo'}</span></div>'" />` :
          `<div class="placeholder-image-box">
            <span class="placeholder-icon">📸</span>
            <span class="placeholder-text">${lang === 'vi' ? 'Cần thêm ảnh' : 'Need photo'}</span>
          </div>`;
        return `
          <article class="timeline-item ${sideClass}" style="animation-delay:${i*0.1}s">
            <div class="timeline-media">
              ${mediaHtml}
            </div>
            <div class="timeline-content">
              <span class="timeline-year">${item.year}</span>
              <h3>${langData.title || ''}</h3>
              <p>${langData.body || ''}</p>
            </div>
          </article>
        `;
      }).join('')}
    `;
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
    NarrationAudio.init();
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

// ===== Narration Audio =====
const NarrationAudio = {
  audio: null,
  isPlaying: false,
  progressEl: null,
  knobEl: null,
  toggleBtn: null,
  triggerBtn: null,
  heroBtn: null,
  currentTimeEl: null,
  durationEl: null,
  trackEl: null,

  init() {
    this.audio = new Audio();
    this.audio.preload = 'none';

    this.progressEl = document.getElementById('audio-progress');
    this.knobEl = document.getElementById('audio-knob');
    this.toggleBtn = document.getElementById('audio-toggle');
    this.triggerBtn = document.getElementById('audio-trigger');
    this.heroBtn = document.getElementById('hero-audio-button');
    this.currentTimeEl = document.getElementById('audio-current-time');
    this.durationEl = document.getElementById('audio-duration');
    this.trackEl = document.querySelector('.audio-track');

    if (!this.toggleBtn) return; // No audio UI present

    this.toggleBtn.addEventListener('click', () => this.toggle());
    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', () => this.toggle());
    }
    if (this.heroBtn) {
      this.heroBtn.addEventListener('click', () => {
        this.play();
        const dest = document.getElementById('thuyet-minh');
        if (dest) dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('durationchange', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this.updateProgress());
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.toggleBtn.textContent = '▶';
      this.audio.currentTime = 0;
      this.updateProgress();
    });

    // Track seeking
    if (this.trackEl) {
      this.trackEl.addEventListener('click', (e) => this.seek(e));
    }

    // Knob scrubbing
    let isScrubbing = false;
    if (this.knobEl) {
      this.knobEl.addEventListener('pointerdown', (e) => {
        isScrubbing = true;
        try { this.knobEl.setPointerCapture(e.pointerId); } catch (err) {}
        document.body.style.userSelect = 'none';
      });
    }

    document.addEventListener('pointermove', (e) => {
      if (!isScrubbing) return;
      this.seek(e);
    });

    document.addEventListener('pointerup', (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      document.body.style.userSelect = '';
    });

    // Language change event listener
    document.addEventListener('langchange', () => {
      const wasPlaying = this.isPlaying;
      this.audio.pause();
      this.isPlaying = false;
      this.toggleBtn.textContent = '▶';
      this.audio.src = i18n.current === 'en' ? 'audio/en/thuyet-minh.mp3' : 'audio/vi/thuyet-minh.mp3';
      this.audio.load();
      if (wasPlaying) {
        this.play();
      } else {
        this.updateProgress();
      }
    });

    // Initial load
    this.audio.src = i18n.current === 'en' ? 'audio/en/thuyet-minh.mp3' : 'audio/vi/thuyet-minh.mp3';
    this.audio.load();
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  updateProgress() {
    const cur = this.audio.currentTime || 0;
    const dur = this.audio.duration || 0;
    if (dur > 0) {
      const pct = (cur / dur) * 100;
      if (this.progressEl) this.progressEl.style.width = `${pct}%`;
      if (this.knobEl) this.knobEl.style.left = `${pct}%`;
      if (this.durationEl) this.durationEl.textContent = this.formatTime(dur);
    }
    if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(cur);
  },

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.toggleBtn.textContent = '▶';
  },

  play() {
    // Pause hotspot modal audio if playing
    if (HotspotModal && HotspotModal.isPlaying) {
      HotspotModal.toggleAudio();
    }
    this.toggleBtn.textContent = '⌛';
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.toggleBtn.textContent = '❚❚';
    }).catch(err => {
      console.warn("Audio play blocked, reloading...", err);
      this.audio.load();
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.toggleBtn.textContent = '❚❚';
      }).catch(e => {
        this.isPlaying = false;
        this.toggleBtn.textContent = '▶';
      });
    });
  },

  seek(e) {
    if (!this.trackEl || !this.audio.duration) return;
    const rect = this.trackEl.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    this.audio.currentTime = pct * this.audio.duration;
    this.updateProgress();
  }
};

// Expose globally
window.NarrationAudio = NarrationAudio;

document.addEventListener('DOMContentLoaded', () => App.init());
