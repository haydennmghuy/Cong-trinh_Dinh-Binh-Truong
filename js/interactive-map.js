const InteractiveMap = {
  currentArea: null,
  init() {
    this.render();
    document.addEventListener('langchange', () => this.render());
  },

  render() {
    const container = document.getElementById('map-svg-container');
    if (!container) return;
    const lang = i18n.current;

    const svgNS = 'http://www.w3.org/2000/svg';
    container.innerHTML = '';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';

    // Draw building outline
    const buildings = [
      // Main hall complex (top-down)
      { x: 35, y: 5, w: 30, h: 15, fill: '#f5e6c8', stroke: '#8B6914', label: '' },   // hau dien
      { x: 35, y: 22, w: 30, h: 14, fill: '#fdf0d5', stroke: '#8B6914', label: '' },  // chanh dien
      { x: 35, y: 38, w: 30, h: 10, fill: '#fdf5e0', stroke: '#8B6914', label: '' },  // tien dien
      // Courtyard
      { x: 30, y: 50, w: 40, h: 18, fill: '#f0e8d0', stroke: '#C9A84C', label: '', dashed: true },
      // Side buildings
      { x: 10, y: 33, w: 22, h: 22, fill: '#f0e0f5', stroke: '#9B7BAE', label: '' }, // vo ca left
      { x: 68, y: 33, w: 22, h: 22, fill: '#ede0d0', stroke: '#8B6914', label: '' }, // columns right
      // Gate
      { x: 40, y: 70, w: 20, h: 10, fill: '#f8e8c0', stroke: '#C9A84C', label: '' },
    ];

    buildings.forEach(b => {
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', b.x); rect.setAttribute('y', b.y);
      rect.setAttribute('width', b.w); rect.setAttribute('height', b.h);
      rect.setAttribute('fill', b.fill); rect.setAttribute('stroke', b.stroke);
      rect.setAttribute('stroke-width', '0.5'); rect.setAttribute('rx', '1');
      if (b.dashed) rect.setAttribute('stroke-dasharray', '1,1');
      svg.appendChild(rect);
    });

    // Draw connecting path (axis)
    const path = document.createElementNS(svgNS, 'line');
    path.setAttribute('x1', '50'); path.setAttribute('y1', '5');
    path.setAttribute('x2', '50'); path.setAttribute('y2', '80');
    path.setAttribute('stroke', '#C9A84C'); path.setAttribute('stroke-width', '0.3');
    path.setAttribute('stroke-dasharray', '1,0.5');
    svg.appendChild(path);

    // Roof ridge decoration lines
    [[35,5,65,5],[35,22,65,22],[35,38,65,38]].forEach(([x1,y1,x2,y2]) => {
      const dec = document.createElementNS(svgNS, 'line');
      dec.setAttribute('x1',x1);dec.setAttribute('y1',y1);
      dec.setAttribute('x2',x2);dec.setAttribute('y2',y2);
      dec.setAttribute('stroke','#C9A84C');dec.setAttribute('stroke-width','1');
      svg.appendChild(dec);
    });

    // Hotspots
    MAP_DATA.areas.forEach((area, idx) => {
      const g = document.createElementNS(svgNS, 'g');
      g.style.cursor = 'pointer';

      // Pulse ring
      const pulse = document.createElementNS(svgNS, 'circle');
      pulse.setAttribute('cx', area.x); pulse.setAttribute('cy', area.y);
      pulse.setAttribute('r', '4');
      pulse.setAttribute('fill', area.color + '33');
      pulse.setAttribute('stroke', area.color);
      pulse.setAttribute('stroke-width', '0.5');
      pulse.style.animation = `pulse 2s infinite ${idx * 0.3}s`;

      // Main dot
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', area.x); dot.setAttribute('cy', area.y);
      dot.setAttribute('r', '2.2');
      dot.setAttribute('fill', area.color);
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '0.5');

      // Number label
      const num = document.createElementNS(svgNS, 'text');
      num.setAttribute('x', area.x); num.setAttribute('y', area.y + 0.8);
      num.setAttribute('text-anchor', 'middle');
      num.setAttribute('fill', '#fff');
      num.setAttribute('font-size', '2');
      num.setAttribute('font-weight', 'bold');
      num.textContent = idx + 1;

      g.appendChild(pulse);
      g.appendChild(dot);
      g.appendChild(num);

      g.addEventListener('click', () => this.openModal(area));
      g.addEventListener('mouseenter', () => { dot.setAttribute('r', '3'); });
      g.addEventListener('mouseleave', () => { dot.setAttribute('r', '2.2'); });

      svg.appendChild(g);
    });

    container.appendChild(svg);

    // Render legend
    this.renderLegend();
  },

  renderLegend() {
    const legend = document.getElementById('map-legend');
    if (!legend) return;
    const lang = i18n.current;
    legend.innerHTML = MAP_DATA.areas.map((area, i) => `
      <button class="legend-item" onclick="InteractiveMap.openModal(MAP_DATA.areas[${i}])">
        <span class="legend-dot" style="background:${area.color}"></span>
        <span>${i+1}. ${area[lang].name}</span>
      </button>
    `).join('');
  },

  openModal(area) {
    this.currentArea = area;
    const lang = i18n.current;
    const modal = document.getElementById('area-modal');
    const data = area[lang];

    document.getElementById('modal-title').textContent = data.name;
    document.getElementById('modal-short').textContent = data.short;
    document.getElementById('modal-desc').textContent = data.desc;
    document.getElementById('modal-color-bar').style.background = area.color;

    // Audio
    const audioSrc = data.audio;
    const audioEl = document.getElementById('modal-audio');
    audioEl.src = audioSrc;

    // Next area
    const areas = MAP_DATA.areas;
    const currentIdx = areas.findIndex(a => a.id === area.id);
    const nextIdx = (currentIdx + 1) % areas.length;
    document.getElementById('modal-next').onclick = () => this.openModal(areas[nextIdx]);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('area-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    const audio = document.getElementById('modal-audio');
    if (audio) { audio.pause(); audio.currentTime = 0; }
  }
};

// Audio guide
const AudioGuide = {
  init() {
    const audio = document.getElementById('modal-audio');
    const playBtn = document.getElementById('audio-play-btn');
    const progress = document.getElementById('audio-progress');
    const timeDisplay = document.getElementById('audio-time');

    if (!audio || !playBtn) return;

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().catch(() => {
          // No audio file in demo — show placeholder
          playBtn.textContent = '⏸ ' + i18n.t('audio_pause');
          this.simulateAudio(audio, progress, timeDisplay, playBtn);
        });
        playBtn.textContent = '⏸ ' + i18n.t('audio_pause');
      } else {
        audio.pause();
        playBtn.textContent = '▶ ' + i18n.t('audio_play');
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (progress) progress.style.width = pct + '%';
        if (timeDisplay) {
          const m = Math.floor(audio.currentTime / 60);
          const s = Math.floor(audio.currentTime % 60).toString().padStart(2,'0');
          timeDisplay.textContent = `${m}:${s}`;
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (playBtn) playBtn.textContent = '▶ ' + i18n.t('audio_play');
      if (progress) progress.style.width = '0%';
    });
  },

  simulateAudio(audio, progress, timeDisplay, playBtn) {
    // Demo simulation when no audio file
    let t = 0;
    const dur = 45;
    const interval = setInterval(() => {
      t++;
      if (t >= dur || !audio.paused || document.getElementById('area-modal')?.classList.contains('open') === false) {
        clearInterval(interval);
        if (playBtn) playBtn.textContent = '▶ ' + i18n.t('audio_play');
        if (progress) progress.style.width = '0%';
        return;
      }
      const pct = (t / dur) * 100;
      if (progress) progress.style.width = pct + '%';
      if (timeDisplay) {
        const m = Math.floor(t / 60);
        const s = (t % 60).toString().padStart(2,'0');
        timeDisplay.textContent = `${m}:${s}`;
      }
    }, 1000);
  }
};
