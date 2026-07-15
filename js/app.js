const HOTSPOT_IMAGES = {
  'cong-tam-quan':        ['images/real/cong_tam_quan_real.jpg'],
  'cong-nho':             [],
  'nha-vo-ca':            ['images/real/vo_ca_real.jpg'],
  'vo-qui':               ['images/real/vo_qui_real.jpg'],
  'chanh-dien':           ['images/real/chanh_dien_real.jpg'],
  'tien-dien':            ['images/real/hau_so_real.jpg'],
  'ho-thuy-ta':           [],
  'bia-tuong-niem':       ['images/real/bia_tuong_niem_real.png'],
  'bia-di-tich':          ['images/real/bia_di_tich_real.png'],
  'mieu-bach-ma':         ['images/real/mieu_bach_ma_real.jpg'],
  'ban-than-nong':        ['images/real/ban_than_nong_real.jpg'],
  'mieu-ho':              [],
  'mieu-ba-ngu-hanh':     ['images/real/mieu_ba_ngu_hanh_real.png'],
  'cot-co':               [],
  'nha-tho-bac-ho':       ['images/real/nha_tho_bac_ho_real.jpg'],
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
    const images = HOTSPOT_IMAGES[this.currentArea.id] || [];

    if (images.length > 0) {
      if (mainImgEl) {
        mainImgEl.src = images[0] + '?v=3.45.32';
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

// ===== Narration Audio (2-track sequential playback with 2s gap) =====
const NarrationAudio = {
  tracks: [],       // Array of Audio elements [track1, track2]
  trackSrcs: [],    // Source URLs
  durations: [0, 0],
  gapDuration: 1,   // 1-second gap between tracks
  currentTrackIdx: 0,
  isPlaying: false,
  _gapTimer: null,
  _inGap: false,
  _gapElapsed: 0,
  _gapRafId: null,
  _gapStartTime: 0,

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
    // Build track source arrays per language
    this.trackSrcs = this._getSources();

    // Create 2 Audio elements
    this.tracks = this.trackSrcs.map(src => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = src;
      return a;
    });

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

    // Track events — timeupdate for progress, ended for chain
    this.tracks.forEach((audio, idx) => {
      audio.addEventListener('timeupdate', () => this.updateProgress());
      audio.addEventListener('durationchange', () => {
        this.durations[idx] = audio.duration || 0;
        this.updateProgress();
      });
      audio.addEventListener('loadedmetadata', () => {
        this.durations[idx] = audio.duration || 0;
        this.updateProgress();
      });
      audio.addEventListener('ended', () => {
        if (idx === 0) {
          // Track 1 ended — start 2-second gap, then play track 2
          this._startGap();
        } else {
          // Track 2 ended — playback complete
          this.isPlaying = false;
          this._inGap = false;
          this.currentTrackIdx = 0;
          this.tracks[0].currentTime = 0;
          this.tracks[1].currentTime = 0;
          this.toggleBtn.textContent = '▶';
          this.updateProgress();
        }
      });
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
      this._cancelGap();
      this.tracks.forEach(a => { a.pause(); a.currentTime = 0; });
      this.isPlaying = false;
      this._inGap = false;
      this.currentTrackIdx = 0;
      this.toggleBtn.textContent = '▶';

      this.trackSrcs = this._getSources();
      this.tracks.forEach((a, i) => {
        a.src = this.trackSrcs[i];
        a.load();
      });

      if (wasPlaying) {
        this.play();
      } else {
        this.updateProgress();
      }
    });
  },

  _getSources() {
    const lang = (typeof i18n !== 'undefined' && i18n?.current) || 'vi';
    const version = '3.45.32';
    if (lang === 'en') {
      return [`audio/en/thuyet-minh-1.mp3?v=${version}`, `audio/en/thuyet-minh-2.mp3?v=${version}`];
    }
    return [`audio/vi/thuyet-minh-1.mp3?v=${version}`, `audio/vi/thuyet-minh-2.mp3?v=${version}`];
  },

  /** Total duration = track1 + gap + track2 */
  get totalDuration() {
    const d1 = this.durations[0] || 0;
    const d2 = this.durations[1] || 0;
    if (d1 === 0 && d2 === 0) return 0;
    return d1 + this.gapDuration + d2;
  },

  /** Current combined elapsed time across both tracks + gap */
  get totalCurrentTime() {
    const d1 = this.durations[0] || 0;
    if (this.currentTrackIdx === 0 && !this._inGap) {
      return this.tracks[0].currentTime || 0;
    }
    if (this._inGap) {
      return d1 + this._gapElapsed;
    }
    // Track 2
    return d1 + this.gapDuration + (this.tracks[1].currentTime || 0);
  },

  _startGap() {
    this._inGap = true;
    this._gapElapsed = 0;
    this._gapStartTime = performance.now();
    this.currentTrackIdx = 1; // Logically in-between, will play track 2 after gap
    
    // Play cassette static transition noise
    this._playStaticNoise(this.gapDuration);

    // Animate gap progress smoothly using rAF
    const animateGap = () => {
      if (!this._inGap) return;
      this._gapElapsed = (performance.now() - this._gapStartTime) / 1000;
      this.updateProgress();
      if (this._gapElapsed >= this.gapDuration) {
        this._inGap = false;
        this._gapElapsed = this.gapDuration;
        this._stopStaticNoise();
        this._playTrack(1);
        return;
      }
      this._gapRafId = requestAnimationFrame(animateGap);
    };
    this._gapRafId = requestAnimationFrame(animateGap);
  },

  _cancelGap() {
    this._inGap = false;
    this._gapElapsed = 0;
    this._stopStaticNoise();
    if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapTimer = null; }
    if (this._gapRafId) { cancelAnimationFrame(this._gapRafId); this._gapRafId = null; }
  },

  _playStaticNoise(duration) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        // Base white noise
        const noise = Math.random() * 2 - 1;
        
        // Add simulated tape hum (50Hz sine wave)
        const t = i / ctx.sampleRate;
        const hum = Math.sin(2 * Math.PI * 50 * t) * 0.3;
        
        // Random tape pops/crackle
        let crackle = 0;
        if (Math.random() < 0.0005) {
          crackle = (Math.random() * 2 - 1) * 2.0;
        }
        
        data[i] = (noise * 0.15 + hum + crackle) * 0.08; // Keep it low and comfortable
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      // Bandpass filter to make it sound like a vintage radio / tape static
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value = 1.2;
      
      // Gain node for smooth fade-in and fade-out
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.25);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      this._activeNoiseSource = source;
      this._activeNoiseCtx = ctx;
    } catch (err) {
      console.warn("Failed to play transition static noise:", err);
    }
  },

  _stopStaticNoise() {
    if (this._activeNoiseSource) {
      try { this._activeNoiseSource.stop(); } catch(e){}
      this._activeNoiseSource = null;
    }
    if (this._activeNoiseCtx) {
      try { this._activeNoiseCtx.close(); } catch(e){}
      this._activeNoiseCtx = null;
    }
  },

  _playTrack(idx) {
    this.currentTrackIdx = idx;
    this.tracks[idx].play().then(() => {
      this.isPlaying = true;
      this.toggleBtn.textContent = '❚❚';
    }).catch(err => {
      console.warn('Track play failed:', err);
      this.tracks[idx].load();
      this.tracks[idx].play().then(() => {
        this.isPlaying = true;
        this.toggleBtn.textContent = '❚❚';
      }).catch(() => {
        this.isPlaying = false;
        this.toggleBtn.textContent = '▶';
      });
    });
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  updateProgress() {
    const cur = this.totalCurrentTime;
    const dur = this.totalDuration;
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
    this._cancelGap();
    this.tracks.forEach(a => a.pause());
    this.isPlaying = false;
    this.toggleBtn.textContent = '▶';
  },

  play() {
    // Pause hotspot modal audio if playing
    if (HotspotModal && HotspotModal.isPlaying) {
      HotspotModal.toggleAudio();
    }
    this.toggleBtn.textContent = '⌛';

    if (this._inGap) {
      // Resume gap countdown
      this._startGap();
      this.isPlaying = true;
      this.toggleBtn.textContent = '❚❚';
      return;
    }

    this._playTrack(this.currentTrackIdx);
  },

  seek(e) {
    if (!this.trackEl) return;
    const dur = this.totalDuration;
    if (!dur) return;

    const rect = this.trackEl.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));

    const seekTime = pct * dur;
    const d1 = this.durations[0] || 0;

    this._cancelGap();

    if (seekTime <= d1) {
      // Seeking into track 1
      this.tracks[1].pause();
      this.tracks[1].currentTime = 0;
      this.currentTrackIdx = 0;
      this._inGap = false;
      this.tracks[0].currentTime = seekTime;
      if (this.isPlaying) this._playTrack(0);
    } else if (seekTime <= d1 + this.gapDuration) {
      // Seeking into the gap — jump to start of track 2
      this.tracks[0].pause();
      this.tracks[0].currentTime = d1;
      this.tracks[1].currentTime = 0;
      this.currentTrackIdx = 1;
      this._inGap = false;
      if (this.isPlaying) this._playTrack(1);
    } else {
      // Seeking into track 2
      this.tracks[0].pause();
      this.tracks[0].currentTime = d1;
      this.currentTrackIdx = 1;
      this._inGap = false;
      this.tracks[1].currentTime = seekTime - d1 - this.gapDuration;
      if (this.isPlaying) this._playTrack(1);
    }
    this.updateProgress();
  }
};

// Expose globally
window.NarrationAudio = NarrationAudio;

document.addEventListener('DOMContentLoaded', () => App.init());
