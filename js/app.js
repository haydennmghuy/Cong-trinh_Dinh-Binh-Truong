const HOTSPOT_IMAGES = {
  'cong-tam-quan':        ['images/real/cong_tam_quan_real.webp'],
  'cong-nho':             [],
  'nha-vo-ca':            ['images/real/vo_ca_real.webp'],
  'vo-qui':               ['images/real/vo_qui_real.webp'],
  'chanh-dien':           ['images/real/chanh_dien_real.webp'],
  'tien-dien':            ['images/real/hau_so_real.webp'],
  'ho-thuy-ta':           [],
  'bia-tuong-niem':       ['images/real/bia_tuong_niem_real.webp'],
  'bia-di-tich':          ['images/real/bia_di_tich_real.webp'],
  'mieu-bach-ma':         ['images/real/mieu_bach_ma_real.webp'],
  'ban-than-nong':        ['images/real/ban_than_nong_real.webp'],
  'mieu-ho':              [],
  'mieu-ba-ngu-hanh':     ['images/real/mieu_ba_ngu_hanh_real.webp'],
  'cot-co':               [],
  'nha-tho-bac-ho':       ['images/real/nha_tho_bac_ho_real.webp'],
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
  _openedAt: 0,  // Timestamp when modal was opened (ghost click prevention)
  _isClosingManually: false,
  timeEl: null,
  durEl: null,
  progEl: null,
  playBtn: null,

  init() {
    this.modalEl = document.getElementById('hotspot-modal');
    if (!this.modalEl) return;

    this.audio = new Audio();
    this.audio.preload = 'none';

    // Cache DOM references to prevent repeated lookups
    this.timeEl = document.getElementById('hotspot-audio-time');
    this.durEl = document.getElementById('hotspot-audio-duration');
    this.progEl = document.getElementById('hotspot-audio-progress');
    this.playBtn = document.getElementById('hotspot-audio-play-btn');

    // Intercept phone/browser back button to close the modal
    window.addEventListener('popstate', () => {
      if (this._isClosingManually) {
        this._isClosingManually = false;
        return;
      }
      if (this.modalEl && this.modalEl.classList.contains('open')) {
        this.closeInternal();
      }
    });

    // Close handlers
    document.getElementById('hotspot-modal-close')?.addEventListener('click', () => this.close());
    // Overlay click to close — with ghost-click guard for mobile
    this.modalEl.querySelector('.hotspot-modal-overlay')?.addEventListener('click', () => {
      // Ignore clicks that arrive within 400ms of the modal opening
      // (prevents mobile ghost/phantom click from auto-closing the modal)
      if (Date.now() - this._openedAt < 400) return;
      this.close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Prevent touch events on the card from bubbling to the overlay (mobile fix)
    this.modalEl.querySelector('.hotspot-modal-card-wrapper')?.addEventListener('touchend', (e) => {
      e.stopPropagation();
    });

    // Play/Pause button
    this.playBtn?.addEventListener('click', () => this.toggleAudio());

    // Seeking on progress track
    const trackBar = document.getElementById('hotspot-audio-track-bar');
    if (trackBar) {
      trackBar.addEventListener('click', (e) => this.seek(e));
    }

    // Audio events (optimized using cached DOM elements)
    this.audio.addEventListener('timeupdate', () => {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;

      if (this.timeEl) this.timeEl.textContent = this.formatTime(cur);
      if (this.durEl && dur > 0) this.durEl.textContent = this.formatTime(dur);
      if (this.progEl && dur > 0) {
        this.progEl.style.width = `${(cur / dur) * 100}%`;
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = this.audio.duration || 0;
      if (this.durEl && dur > 0) this.durEl.textContent = this.formatTime(dur);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this.playBtn) this.playBtn.textContent = '▶';
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
    const images = HOTSPOT_IMAGES[this.currentArea.id] || [];

    if (images.length > 0) {
      if (mainImgEl) {
        mainImgEl.src = images[0] + '?v=3.47.08';
        mainImgEl.alt = data.name;
        mainImgEl.classList.remove('hidden');
        
        // Make sure vertical shrines/steles are aligned properly so their headers and features are visible
        mainImgEl.style.objectFit = 'cover';
        mainImgEl.style.backgroundColor = 'transparent';
        
        const positionMapping = {
          'mieu-ba-ngu-hanh': '50% 38%',
          'bia-di-tich': '50% 15%',
          'mieu-bach-ma': '50% 20%',
          'mieu-ho': 'top',
          'chanh-dien': '50% 58%',
          'ban-than-nong': '50% 68%',
          'bia-tuong-niem': '50% 40%',
          'nha-tho-bac-ho': '50% 55%'
        };
        mainImgEl.style.objectPosition = positionMapping[this.currentArea.id] || 'center';
      }
      if (placeholderEl) {
        placeholderEl.classList.add('hidden');
      }
    } else {
      if (mainImgEl) {
        mainImgEl.classList.add('hidden');
      }
      if (placeholderEl) {
        placeholderEl.classList.remove('hidden');
      }
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

    // Push history state if opening the modal for the first time
    if (!this.modalEl.classList.contains('open')) {
      history.pushState({ modalOpen: true }, '');
    }

    // Show modal
    this._openedAt = Date.now(); // Record open time for ghost-click prevention
    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus camera on the corresponding 3D spot
    if (window.Temple3D && typeof window.Temple3D.focusOnArea === 'function') {
      window.Temple3D.focusOnArea(area.id);
    }
  },

  close() {
    if (!this.modalEl) return;
    
    // If the modal was opened via history, pop the state manually
    if (history.state && history.state.modalOpen) {
      this._isClosingManually = true;
      history.back();
    }
    
    this.closeInternal();
  },

  closeInternal() {
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

    // Header scroll effect (throttled with requestAnimationFrame)
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          const header = document.getElementById('header');
          if (header) header.classList.toggle('scrolled', window.scrollY > 20);
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    });
  },

  initScrollReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
};

// ===== Narration Audio (2-track sequential playback with 2s gap) =====
const NarrationAudio = {
  audio: null,      // Single Audio element
  isPlaying: false,

  // UI elements
  progressEl: null,
  knobEl: null,
  toggleBtn: null,
  triggerBtn: null,
  heroBtn: null,
  currentTimeEl: null,
  durationEl: null,
  trackEl: null,

  init() {
    // Create Audio element
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.src = this._getSource();

    // UI references
    this.progressEl = document.getElementById('audio-progress');
    this.knobEl = document.getElementById('audio-knob');
    this.toggleBtn = document.getElementById('audio-toggle');
    this.triggerBtn = document.getElementById('audio-trigger');
    this.heroBtn = document.getElementById('hero-audio-button');
    this.currentTimeEl = document.getElementById('audio-current-time');
    this.durationEl = document.getElementById('audio-duration');
    this.trackEl = document.querySelector('.audio-track');

    if (!this.toggleBtn) return;

    // Button events
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

    // Audio events
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('durationchange', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this.updateProgress());
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.audio.currentTime = 0;
      this.toggleBtn.textContent = '▶';
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
    document.addEventListener('pointerup', () => {
      if (!isScrubbing) return;
      isScrubbing = false;
      document.body.style.userSelect = '';
    });

    // Language change
    document.addEventListener('langchange', () => {
      const wasPlaying = this.isPlaying;
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.toggleBtn.textContent = '▶';

      this.audio.src = this._getSource();
      this.audio.load();

      if (wasPlaying) {
        this.play();
      } else {
        this.updateProgress();
      }
    });
  },

  _getSource() {
    const lang = (typeof i18n !== 'undefined' && i18n?.current) || 'vi';
    const version = '3.47.08';
    if (lang === 'en') {
      return `audio/en/thuyet-minh.mp3?v=${version}`;
    }
    return `audio/vi/thuyet-minh.mp3?v=${version}`;
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
      console.warn('Playback failed:', err);
      this.audio.load();
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.toggleBtn.textContent = '❚❚';
      }).catch(() => {
        this.isPlaying = false;
        this.toggleBtn.textContent = '▶';
      });
    });
  },

  seek(e) {
    if (!this.trackEl) return;
    const dur = this.audio.duration || 0;
    if (!dur) return;

    const rect = this.trackEl.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));

    this.audio.currentTime = pct * dur;
    this.updateProgress();
  }
};

// Expose globally
window.NarrationAudio = NarrationAudio;

document.addEventListener('DOMContentLoaded', () => App.init());
