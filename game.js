'use strict';
/*
 * Corre, Jensen! — jogo satírico de navegador.
 * Canvas 2D, sem dependências. Abra index.html (ou sirva a pasta) e jogue.
 * Parâmetros de debug: ?debug=1 (hitboxes, FPS, K pula fase, L +1 jaqueta) e ?stage=N (começa na fase N).
 */
(() => {
  // ======================================================================
  // CONFIGURAÇÃO
  // ======================================================================
  const SITE_URL = 'https://jh.playground.tec.br'; // endereço público do jogo (ex.: 'https://seudominio.com'); vazio = usa o endereço atual
  const REPO_URL = 'https://github.com/eziolemes/jhgame'; // código-fonte do projeto (botão GITHUB)
  const W = 960, H = 540;
  const FLOOR_TOP = 182, FLOOR_BOT = 524;
  const TAU = Math.PI * 2;
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const TITLE = '"Arial Black", Impact, "Segoe UI Black", sans-serif';

  const PLAYER_SPEED = 225, DASH_SPEED = 700, DASH_TIME = 0.17, DASH_CD = 1.9;
  const CS = 1.2; // escala dos personagens
  const DECOY_TIME = 4, DECOY_RADIUS = 340, MAX_DECOYS = 5, SHIELD_TIME = 5, HURT_INV = 1.6;

  const params = new URLSearchParams(location.search);
  const DEBUG = params.has('debug');
  const START_STAGE = Math.max(0, Math.min(3, (parseInt(params.get('stage'), 10) || 1) - 1));

  const DIFFS = {
    facil: { key: 'facil', label: 'FÁCIL', lives: 5, maxLives: 6, speed: 0.82, spawn: 0.7, maxEnemies: 8, decoys: 4, mult: 0.75 },
    normal: { key: 'normal', label: 'NORMAL', lives: 3, maxLives: 5, speed: 1.0, spawn: 1.0, maxEnemies: 12, decoys: 3, mult: 1 },
    dificil: { key: 'dificil', label: 'DIFÍCIL', lives: 2, maxLives: 4, speed: 1.17, spawn: 1.35, maxEnemies: 16, decoys: 2, mult: 1.4 },
  };

  const STAGES = [
    {
      key: 'keynote', name: 'KEYNOTE', len: 4200, exit: 'BASTIDORES',
      kicker: 'FASE 1 · KEYNOTE',
      headline: 'Jensen sobe ao palco da keynote. Na plateia, fãs suspeitamente interessadas em chips.',
      tip: 'Fuja das fãs-espiãs. A Jaqueta Turbo (Espaço) atravessa o grupo sem tomar dano.',
      tipTouch: 'Fuja das fãs-espiãs. O botão TURBO atravessa o grupo sem tomar dano.',
      spawn: { fan: 1 }, aheadGap: 340, behindEvery: 3.6, pairChance: 0.1, watchers: 0,
      obstacles: [['speaker', 24, 14, 2], ['roadcase', 30, 16, 2], ['camrig', 18, 10, 1]], obsGap: [300, 460],
      pickups: { gpu: 2, memo: 1, slam: 0 },
    },
    {
      key: 'campus', name: 'CAMPUS', len: 4700, exit: 'ESTACIONAMENTO',
      kicker: 'FASE 2 · CAMPUS',
      headline: 'URGENTE: Conselho da Nvidia contrata ex-promotor para investigar o próprio CEO.',
      tip: 'Espiãs de binóculo vigiam o campus. Se te avistarem, todas aceleram. Os obstáculos bloqueiam a visão delas.',
      spawn: { fan: 1 }, aheadGap: 320, behindEvery: 3.3, pairChance: 0.25, watchers: 5,
      obstacles: [['planter', 36, 18, 2], ['tree', 20, 14, 2], ['bench', 40, 8, 1]], obsGap: [280, 420],
      pickups: { gpu: 3, memo: 1, slam: 0 },
    },
    {
      key: 'diner', name: 'DINER', len: 5100, exit: 'SAÍDA DOS FUNDOS',
      kicker: 'FASE 3 · O DINER',
      headline: 'Em memorando, Jensen admite: “fui infiel”. Ele se esconde no diner onde tudo começou.',
      tip: 'A espiã do jantar avança em linha reta e joga beijinhos. Isca de GPU (E) distrai todo mundo. O café da manhã devolve uma jaqueta.',
      tipTouch: 'A espiã do jantar avança em linha reta e joga beijinhos. A isca de GPU distrai todo mundo. O café da manhã devolve uma jaqueta.',
      spawn: { fan: 0.55, diner: 1 }, aheadGap: 330, behindEvery: 3.4, pairChance: 0.25, watchers: 3,
      obstacles: [['table', 28, 14, 3], ['booth', 46, 14, 2]], obsGap: [240, 380],
      pickups: { gpu: 3, memo: 1, slam: 2 },
    },
    {
      key: 'capitol', name: 'CAPITÓLIO', len: 5600, exit: 'CASA',
      kicker: 'FASE 4 · CAPITÓLIO',
      headline: 'Congresso quer ouvir Jensen. Pequim nega tudo. Os paparazzi não negam nada.',
      tip: 'Assessores jogam intimações e o flash dos paparazzi te cega. No fim do corredor: a sua casa.',
      spawn: { fan: 0.4, diner: 0.4, aide: 1, paparazzi: 0.8 }, aheadGap: 320, behindEvery: 3.2, pairChance: 0.3, watchers: 2,
      obstacles: [['column', 22, 16, 3], ['podium', 20, 12, 1], ['rope', 50, 6, 1]], obsGap: [260, 400],
      pickups: { gpu: 3, memo: 2, slam: 1 },
    },
  ];

  // ---------------- textos ----------------
  const CAUGHT = {
    fan: ['“Só uma selfie… e o roadmap da próxima GPU.”', '“Sou muito sua fã. Principalmente dos chips.”', '“Autografa essa placa de vídeo pra mim?”', '“Jensen! Olha pra câmera… escondida.”'],
    watcher: ['“Alvo avistado. Jaqueta de couro confirmada.”', '“Central, encontrei o homem da jaqueta.”'],
    diner: ['“Me fala mais sobre o Blackwell…”', '“Jantar? Eu pago. Você traz os chips.”', '“Que coincidência te encontrar aqui, Jensen.”'],
    kiss: ['Atingido por um beijinho. O compliance não vai gostar.', 'Um beijinho voador. O conselho já está sabendo.'],
    aide: ['“O senhor está convidado a depor. A portas fechadas.”', '“O comitê gostaria de uma palavrinha, Sr. Huang.”'],
    paper: ['Intimado! O Congresso quer explicações.', 'Uma intimação bem no meio da testa.'],
    paparazzi: ['Flash! Sua cara está em todos os sites de notícia.', '“Sorria! Você está na primeira página.”'],
  };
  const OVER_NOTES = [
    'O conselho está “avaliando a situação”.',
    'A Nvidia informa que nenhum segredo comercial foi compartilhado.',
    'Pequim nega qualquer envolvimento.',
    'Um ex-promotor já está revisando as imagens.',
    'As ações oscilaram durante a sua captura.',
  ];
  const BUBBLES = {
    fan: ['Qual a senha do seu e-mail?', 'Onde os chips são fabricados?', 'Ninguém vai saber!', 'Eu gosto de vc de verdade!', 'Qual o seu segredo?'],
    watcher: ['…', 'Hmm.', 'Cadê ele?'],
    diner: ['Jantar?', 'Oi, sumido.', 'Vem cá…'],
    aide: ['Intimação!', 'Sr. Huang!', 'O comitê!'],
    paparazzi: ['Sorria!', 'Aqui!', 'Exclusiva!'],
  };
  const DECOY_LINES = ['Chips grátis!', 'Exportação concluída!', 'H20? Serve!', 'Obrigada, Jensen!', 'Isso tem licença?'];
  const DECOY_TOASTS = ['QUANTO MAIS VOCÊ COMPRA, MAIS VOCÊ ECONOMIZA', 'EXPORTAÇÃO NÃO AUTORIZADA', 'GPU GRÁTIS NO CORREDOR'];
  const RANKS = [
    [0, 'Estagiário da fábrica de chips'],
    [900, 'Revendedor de placa de vídeo'],
    [1800, 'Gerente de data center'],
    [2800, 'VP de Jaquetas de Couro'],
    [3800, 'CEO Trilionário'],
  ];
  const SKINS = ['#f2d0b1', '#e7bc96', '#c68e63', '#9a6644', '#6e4630', '#f5c9a6'];
  const HAIRS = ['#1c1c1c', '#3b2416', '#7a2e1a', '#c99a4b', '#5a3a22', '#2b2b30'];
  // espiãs: tons de pele naturais do leste asiático e cabelo preto / castanho bem escuro
  const SPY_SKINS = ['#f6dcc4', '#f1cfb0', '#ebc4a0', '#e2b892', '#d6a881'];
  const SPY_HAIRS = ['#0f0d12', '#16121a', '#1d1517', '#261a16'];
  const SPY_TYPES = { fan: 1, watcher: 1, diner: 1 };

  // ======================================================================
  // UTILIDADES
  // ======================================================================
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const fmtInt = (n) => Math.round(n).toLocaleString('pt-BR');
  const fmtTime = (s) => { s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickWeighted(table, rnd = Math.random) {
    let total = 0;
    for (const k in table) total += table[k];
    let r = rnd() * total;
    for (const k in table) { r -= table[k]; if (r <= 0) return k; }
    return Object.keys(table)[0];
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('correjensen_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('correjensen_' + k, JSON.stringify(v)); } catch (e) { /* sem storage */ } },
  };
  const { rr, ell } = SPR;

  // ======================================================================
  // ÁUDIO (tudo sintetizado com WebAudio)
  // ======================================================================
  const Sound = (() => {
    let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
    let muted = !!store.get('muted', false);
    let timer = null, nextT = 0, step = 0, tempo = 132, root = 0;
    const BASS = [0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 7, 0, 5, 0, 7, 10];
    const LEAD = [12, null, 15, null, 19, null, 15, 12, null, 22, null, 19, 17, null, 15, null];

    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try { ac = new AC(); } catch (e) { return false; }
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
        sfxBus = ac.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
        musBus = ac.createGain(); musBus.gain.value = 0.17; musBus.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume().catch(() => { });
      return true;
    }
    function osc(freq, dur, { type = 'square', vol = 0.25, slide = 0, at = 0, bus = null } = {}) {
      if (!ac) return;
      const t0 = Math.max(ac.currentTime, at || ac.currentTime);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(bus || sfxBus);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(dur, { vol = 0.25, freq = 1800, q = 0.8, type = 'bandpass', at = 0, sweep = 0, bus = null } = {}) {
      if (!ac) return;
      const t0 = Math.max(ac.currentTime, at || ac.currentTime);
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t0);
      if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t0 + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(bus || sfxBus);
      s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
    }
    const seq = (notes, gap, opts) => { const t = ac ? ac.currentTime : 0; notes.forEach((n, i) => osc(n, gap * 1.3, { ...opts, at: t + i * gap })); };

    function sfx(name, arg = 0) {
      if (!ac || muted) return;
      const t = ac.currentTime;
      switch (name) {
        case 'chip': osc(1250 + Math.min(arg, 8) * 70, 0.07, { vol: 0.09 }); osc(1900 + Math.min(arg, 8) * 90, 0.06, { vol: 0.07, at: t + 0.04 }); break;
        case 'gpu': seq([440, 660, 880], 0.07, { type: 'triangle', vol: 0.22 }); break;
        case 'power': seq([523, 659, 784, 1046], 0.06, { type: 'triangle', vol: 0.22 }); break;
        case 'life': seq([392, 523, 659, 784, 1046], 0.065, { type: 'square', vol: 0.12 }); break;
        case 'hit': noise(0.28, { type: 'lowpass', freq: 900, vol: 0.55 }); osc(170, 0.3, { type: 'sawtooth', slide: 0.35, vol: 0.28 }); break;
        case 'dash': noise(0.22, { freq: 500, sweep: 5, vol: 0.35, q: 1.2 }); break;
        case 'decoy': osc(220, 0.1, { vol: 0.16 }); osc(330, 0.1, { vol: 0.16, at: t + 0.09 }); osc(495, 0.16, { vol: 0.16, at: t + 0.18 }); break;
        case 'alert': [0, 1, 2, 3].forEach((i) => osc(i % 2 ? 660 : 880, 0.11, { vol: 0.12, at: t + i * 0.12 })); break;
        case 'flash': noise(0.07, { type: 'highpass', freq: 3500, vol: 0.5 }); osc(2600, 0.3, { type: 'sine', slide: 0.25, vol: 0.12, at: t + 0.03 }); break;
        case 'kiss': osc(800, 0.12, { type: 'sine', slide: 1.7, vol: 0.14 }); osc(1000, 0.12, { type: 'sine', slide: 1.7, vol: 0.12, at: t + 0.1 }); break;
        case 'paper': noise(0.1, { freq: 2600, vol: 0.22 }); break;
        case 'swoosh': noise(0.3, { freq: 1200, sweep: 0.3, vol: 0.25 }); break;
        case 'bonk': osc(240, 0.12, { slide: 0.5, vol: 0.18 }); break;
        case 'grab': osc(660, 0.08, { type: 'triangle', vol: 0.15 }); osc(990, 0.1, { type: 'triangle', vol: 0.12, at: t + 0.07 }); break;
        case 'denied': osc(180, 0.12, { vol: 0.14 }); osc(150, 0.16, { vol: 0.14, at: t + 0.13 }); break;
        case 'clear': seq([523, 659, 784, 1046, 1318], 0.07, { vol: 0.12 }); break;
        case 'win': seq([392, 523, 659, 784, 659, 784, 1046], 0.11, { type: 'triangle', vol: 0.25 }); break;
        case 'over': seq([392, 330, 262, 196], 0.18, { type: 'sawtooth', vol: 0.14 }); break;
        case 'click': osc(720, 0.04, { vol: 0.08 }); break;
      }
    }

    function schedule() {
      if (!ac) return;
      const spb = 60 / tempo / 4;
      while (nextT < ac.currentTime + 0.12) {
        const s = step % 16, bar = (step >> 4) % 4;
        if (s % 4 === 0) osc(150, 0.13, { type: 'sine', slide: 0.3, vol: 0.7, at: nextT, bus: musBus });
        if (s % 8 === 4) noise(0.12, { freq: 1800, vol: 0.3, at: nextT, bus: musBus });
        if (s % 2 === 1) noise(0.035, { type: 'highpass', freq: 7000, vol: 0.12, at: nextT, bus: musBus });
        const b = BASS[s];
        osc(110 * Math.pow(2, (b + root) / 12), spb * 0.9, { type: 'square', vol: 0.2, at: nextT, bus: musBus });
        if (bar >= 2 && LEAD[s] !== null) osc(220 * Math.pow(2, (LEAD[s] + root) / 12), spb * 0.85, { type: 'triangle', vol: 0.2, at: nextT, bus: musBus });
        nextT += spb;
        step++;
      }
    }
    function startMusic(stageIdx) {
      if (!ensure()) return;
      tempo = [128, 136, 144, 152][stageIdx] || 132;
      root = [0, 2, -2, 3][stageIdx] || 0;
      if (!timer) { nextT = ac.currentTime + 0.06; step = 0; timer = setInterval(schedule, 25); }
    }
    function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }
    function toggleMute() {
      muted = !muted;
      store.set('muted', muted);
      if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.02);
      return muted;
    }
    return { ensure, sfx, startMusic, stopMusic, toggleMute, isMuted: () => muted };
  })();

  // ======================================================================
  // DOM
  // ======================================================================
  const $ = (id) => document.getElementById(id);
  const frame = $('frame'), canvas = $('game'), ctx = canvas.getContext('2d');
  const ui = {
    hud: $('hud'), lives: $('lives'), chips: document.querySelector('#chips b'), gpus: document.querySelector('#gpus b'),
    turbo: $('turbo'), turboBar: document.querySelector('#turbo i b'), shield: $('shield'),
    progFill: $('progress-fill'), progDot: $('prog-dot'), progLabel: $('progress-label'), tickLabels: document.querySelectorAll('#ticklabels span'),
    toast: $('toast'), btnMute: $('btn-mute'), btnPause: $('btn-pause'),
    btnDash: $('btn-dash'), dashRing: document.querySelector('#btn-dash circle'), btnGpu: $('btn-gpu'), gpuSmall: document.querySelector('#btn-gpu small'),
    best: $('best'),
    cardKicker: $('card-kicker'), cardHeadline: $('card-headline'), cardTip: $('card-tip'), cardEdition: $('card-edition'),
    overQuote: $('over-quote'), overNote: $('over-note'), overStats: $('over-stats'),
    winRank: $('win-rank'), winStats: $('win-stats'),
  };
  const OVERLAYS = ['menu', 'card', 'pause', 'over', 'win'].map($);
  function showOverlay(id) { for (const el of OVERLAYS) el.classList.toggle('show', el.id === id); }

  let scale = 1;
  function resize() {
    const fw = frame.clientWidth, fh = frame.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(fw * dpr));
    canvas.height = Math.max(1, Math.round(fh * dpr));
    scale = canvas.width / W;
    frame.style.fontSize = (fw / 960) * 16 + 'px';
  }
  const isTouch = () => document.body.classList.contains('touch');

  // ======================================================================
  // ESTADO
  // ======================================================================
  const G = {
    state: 'menu', diffKey: DIFFS[store.get('diff', 'normal')] ? store.get('diff', 'normal') : 'normal', diff: DIFFS.normal,
    stageIdx: 0, stage: STAGES[0], camX: 0, t: 0, stageT: 0, runTime: 0,
    lives: 3, chips: 0, score: 0, decoys: 3, decoysUsed: 0, grabs: 0, hits: 0, chipCombo: 0, chipT: 0,
    enemies: [], projectiles: [], pickups: [], particles: [], obstacles: [], decoyObjs: [],
    alertT: 0, blindT: 0, shakeT: 0, shakeMag: 0, dieT: 0, clearT: 0,
    nextAheadX: 0, behindT: 0, lastCause: 'fan', lastLine: '', shareText: '', gotGpuHint: false,
  };
  const P = { x: 120, y: 350, r: 14, vx: 0, vy: 0, face: 1, moving: false, t: 0, dashT: 0, dashCd: 0, dx: 1, dy: 0, inv: 0, shield: 0, kbx: 0, kby: 0, ghostT: 0, spin: 0 };

  // ======================================================================
  // ENTRADA
  // ======================================================================
  const keys = new Set();
  const joy = { id: null, active: false, ox: 0, oy: 0, kx: 0, ky: 0, dx: 0, dy: 0 };

  function moveInput() {
    let mx = 0, my = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) mx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) mx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) my -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) my += 1;
    if (joy.active) { mx += joy.dx; my += joy.dy; }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    return [mx, my];
  }

  window.addEventListener('keydown', (e) => {
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    keys.add(c);
    if (e.repeat) return;
    Sound.ensure();
    if (c === 'KeyM') { toggleMute(); return; }
    switch (G.state) {
      case 'menu': if (c === 'Enter' || c === 'Space') startRun(); break;
      case 'card': if (c === 'Enter' || c === 'Space') go(); break;
      case 'playing':
        if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight') dash();
        else if (c === 'KeyE' || c === 'KeyQ' || c === 'KeyF') dropDecoy();
        else if (c === 'Escape' || c === 'KeyP') pause();
        else if (DEBUG && c === 'KeyK') { P.x = G.stage.len - 60; }
        else if (DEBUG && c === 'KeyL') { G.lives = Math.min(G.diff.maxLives, G.lives + 1); }
        break;
      case 'paused': if (c === 'Escape' || c === 'KeyP' || c === 'Enter') resume(); break;
      case 'over': case 'won': if (c === 'Enter') startRun(); break;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); pause(); } });

  // toque: joystick flutuante no lado esquerdo
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); }, true);
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

  function toScreen(e) {
    const r = frame.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  frame.addEventListener('pointerdown', (e) => {
    if (G.state !== 'playing' || e.pointerType === 'mouse' || joy.id !== null) return;
    if (e.target.closest('button')) return;
    const p = toScreen(e);
    if (p.x > W * 0.62) return;
    joy.id = e.pointerId; joy.active = true;
    joy.ox = p.x; joy.oy = p.y; joy.kx = joy.ky = joy.dx = joy.dy = 0;
    try { frame.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  frame.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    const p = toScreen(e), R = 56;
    let dx = p.x - joy.ox, dy = p.y - joy.oy;
    const m = Math.hypot(dx, dy);
    if (m > R) { joy.ox += (dx / m) * (m - R); joy.oy += (dy / m) * (m - R); dx = p.x - joy.ox; dy = p.y - joy.oy; }
    joy.kx = dx; joy.ky = dy;
    const n = Math.min(1, Math.hypot(dx, dy) / R), dz = 0.14;
    const mag = n < dz ? 0 : (n - dz) / (1 - dz), a = Math.atan2(dy, dx);
    joy.dx = Math.cos(a) * mag; joy.dy = Math.sin(a) * mag;
  });
  const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.active = false; joy.dx = joy.dy = joy.kx = joy.ky = 0; } };
  frame.addEventListener('pointerup', endJoy);
  frame.addEventListener('pointercancel', endJoy);

  function holdButton(el, fn) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); Sound.ensure(); fn(); });
    const up = () => el.classList.remove('down');
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  holdButton(ui.btnDash, () => dash());
  holdButton(ui.btnGpu, () => dropDecoy());

  const portraitQ = window.matchMedia ? matchMedia('(orientation: portrait) and (pointer: coarse)') : { matches: false };
  const onPortrait = () => { if (portraitQ.matches) pause(); };
  if (portraitQ.addEventListener) portraitQ.addEventListener('change', onPortrait);

  // ======================================================================
  // GERAÇÃO DA FASE
  // ======================================================================
  function obstacleAt(x, y, pad) {
    for (const o of G.obstacles) {
      if (x > o.x - o.hw - pad && x < o.x + o.hw + pad && y > o.y - o.hh - pad && y < o.y + o.hh + pad) return o;
    }
    return null;
  }

  function loadStage(i) {
    const st = STAGES[i];
    G.stageIdx = i; G.stage = st;
    G.camX = 0; G.stageT = 0;
    G.enemies = []; G.projectiles = []; G.pickups = []; G.particles = []; G.obstacles = []; G.decoyObjs = [];
    G.alertT = 0; G.blindT = 0; G.shakeT = 0; G.clearT = 0; G.alertHint = false;
    G.nextAheadX = W + 180; G.behindT = 2.5;
    Object.assign(P, { x: 120, y: (FLOOR_TOP + FLOOR_BOT) / 2, vx: 0, vy: 0, face: 1, dashT: 0, dashCd: 0, inv: 0.8, shield: 0, kbx: 0, kby: 0, spin: 0 });

    const rnd = mulberry32(7919 * (i + 1) + 13);
    const R = (a, b) => a + rnd() * (b - a);
    const kinds = {};
    st.obstacles.forEach((o, k) => { kinds[k] = o[3]; });

    // obstáculos
    let x = 620;
    while (x < st.len - 420) {
      const [kind, hw, hh] = st.obstacles[+pickWeighted(kinds, rnd)];
      const y = R(FLOOR_TOP + hh + 30, FLOOR_BOT - hh - 18);
      G.obstacles.push({ x, y, hw, hh, kind });
      if (rnd() < 0.35) {
        const [k2, hw2, hh2] = st.obstacles[+pickWeighted(kinds, rnd)];
        const y2 = y < (FLOOR_TOP + FLOOR_BOT) / 2 ? R(y + 150, FLOOR_BOT - hh2 - 18) : R(FLOOR_TOP + hh2 + 30, y - 150);
        if (y2 > FLOOR_TOP + hh2 + 20 && y2 < FLOOR_BOT - hh2 - 10) G.obstacles.push({ x: x + R(-40, 40), y: y2, hw: hw2, hh: hh2, kind: k2 });
      }
      x += R(st.obsGap[0], st.obsGap[1]);
    }

    // chips
    x = 460;
    while (x < st.len - 300) {
      const pat = (rnd() * 4) | 0, y0 = R(FLOOR_TOP + 60, FLOOR_BOT - 60);
      const pts = [];
      if (pat === 0) for (let k = 0; k < 5; k++) pts.push([x + k * 34, y0]);
      else if (pat === 1) for (let k = 0; k < 5; k++) pts.push([x + k * 32, y0 - Math.sin((k / 4) * Math.PI) * 55]);
      else if (pat === 2) for (let k = 0; k < 4; k++) pts.push([x, y0 - 60 + k * 40]);
      else for (let k = 0; k < 5; k++) pts.push([x + k * 30, y0 - 50 + k * 25]);
      for (const [cx, cy] of pts) {
        if (cy > FLOOR_TOP + 22 && cy < FLOOR_BOT - 8 && !obstacleAt(cx, cy, 16)) G.pickups.push({ kind: 'chip', x: cx, y: cy });
      }
      x += R(320, 440);
    }

    // itens especiais
    for (const kind of ['gpu', 'memo', 'slam']) {
      const n = st.pickups[kind] || 0;
      for (let k = 0; k < n; k++) {
        let px = 700 + ((k + 0.5) / n) * (st.len - 1300) + R(-150, 150), py = R(FLOOR_TOP + 40, FLOOR_BOT - 20);
        for (let tries = 0; tries < 12 && obstacleAt(px, py, 26); tries++) { px += 37; py = R(FLOOR_TOP + 40, FLOOR_BOT - 20); }
        G.pickups.push({ kind, x: px, y: py });
      }
    }

    // vigias de binóculo
    for (let k = 0; k < st.watchers; k++) {
      let wx = 900 + ((k + 0.5) / st.watchers) * (st.len - 1600) + R(-100, 100);
      const top = rnd() < 0.5, wy = top ? FLOOR_TOP + 14 : FLOOR_BOT - 6;
      for (let tries = 0; tries < 10 && obstacleAt(wx, wy, 30); tries++) wx += 40;
      spawnEnemy('watcher', wx, wy, {
        baseAng: top ? Math.PI / 2 + 0.55 : -Math.PI / 2 - 0.55, ang: 0, phase: rnd() * 6, range: 300, half: 0.36, cd: 0, seeing: false,
      });
    }
  }

  // ======================================================================
  // ENTIDADES
  // ======================================================================
  function spawnEnemy(type, x, y, extra) {
    const e = {
      type, x, y, r: 13, face: -1, t: rand(0, 10), state: 'move', st: rand(0.3, 1.2), stun: 0, alpha: 1,
      bubble: null, bubbleCd: rand(1, 4), look: (Math.random() * 1e6) | 0,
      skin: pick(SPY_TYPES[type] ? SPY_SKINS : SKINS), hair: pick(SPY_TYPES[type] ? SPY_HAIRS : HAIRS), hat: Math.random() < 0.45,
      decoy: null, leaving: false, detourT: 0, detourDir: 0, cd: rand(0.8, 1.8), vx: 0, vy: 0, moving: false,
      strafe: Math.random() < 0.5 ? -1 : 1, combo: 0, flashT: 0,
    };
    Object.assign(e, extra);
    for (let k = 0; k < 4; k++) { const o = obstacleAt(e.x, e.y, e.r); if (!o) break; e.y = e.y < o.y ? o.y - o.hh - e.r - 2 : o.y + o.hh + e.r + 2; }
    e.y = clamp(e.y, FLOOR_TOP + 10, FLOOR_BOT - 4);
    G.enemies.push(e);
    return e;
  }

  function say(e, text, dur = 1.5) { e.bubble = { text, t: dur }; }
  const onScreen = (e, pad = 0) => e.x > G.camX - pad && e.x < G.camX + W + pad;

  function pushOut(e, o) {
    const cx = clamp(e.x, o.x - o.hw, o.x + o.hw), cy = clamp(e.y, o.y - o.hh, o.y + o.hh);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= e.r * e.r) return false;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      e.x += (dx / d) * (e.r - d); e.y += (dy / d) * (e.r - d);
    } else {
      const px = o.hw - Math.abs(e.x - o.x), py = o.hh - Math.abs(e.y - o.y);
      if (px < py) e.x += Math.sign(e.x - o.x || 1) * (px + e.r);
      else e.y += Math.sign(e.y - o.y || 1) * (py + e.r);
    }
    return true;
  }
  function collideWorld(e) {
    let hit = null;
    for (const o of G.obstacles) if (Math.abs(o.x - e.x) < o.hw + 30 && pushOut(e, o)) hit = o;
    e.y = clamp(e.y, FLOOR_TOP + 10, FLOOR_BOT - 4);
    return hit;
  }
  // linha de visão: segmento contra retângulos (método das lajes)
  function hasLOS(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    for (const o of G.obstacles) {
      if (Math.max(ax, bx) < o.x - o.hw || Math.min(ax, bx) > o.x + o.hw) continue;
      let t0 = 0, t1 = 1;
      const slabs = [[dx, ax, o.x - o.hw, o.x + o.hw], [dy, ay, o.y - o.hh - 20, o.y + o.hh]];
      let blocked = true;
      for (const [d, a, lo, hi] of slabs) {
        if (Math.abs(d) < 1e-6) { if (a < lo || a > hi) { blocked = false; break; } continue; }
        let ta = (lo - a) / d, tb = (hi - a) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) { blocked = false; break; }
      }
      if (blocked) return false;
    }
    return true;
  }

  function steer(e, tx, ty, spd, dt) {
    let dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (e.detourT > 0) {
      e.detourT -= dt;
      dx *= 0.35; dy = e.detourDir;
    }
    for (const o of G.enemies) {
      if (o === e || o.leaving || o.type === 'watcher') continue;
      const ox = e.x - o.x, oy = e.y - o.y, q = ox * ox + oy * oy;
      if (q < 900 && q > 0.01) { const qq = Math.sqrt(q), k = ((900 - q) / 900) * 0.9; dx += (ox / qq) * k; dy += (oy / qq) * k; }
    }
    const m = Math.hypot(dx, dy) || 1;
    e.x += (dx / m) * spd * dt;
    e.y += (dy / m) * spd * dt;
    e.moving = true;
    if (Math.abs(dx) > 0.15) e.face = dx > 0 ? 1 : -1;
    const hit = collideWorld(e);
    if (hit && e.detourT <= 0) { e.detourT = 0.45; e.detourDir = e.y < hit.y ? -1 : 1; }
  }

  function knock(e, force, stunT) {
    const dx = e.x - P.x, dy = e.y - P.y, m = Math.hypot(dx, dy) || 1;
    e.stun = stunT;
    if (e.type !== 'watcher') { e.vx = (dx / m) * force; e.vy = (dy / m) * force; }
    if (e.type === 'diner' || e.type === 'paparazzi') { e.state = 'move'; e.st = 1; }
  }

  function shoot(e, kind, ang, speed) {
    G.projectiles.push({ kind, x: e.x + Math.cos(ang) * 14, y: e.y + Math.sin(ang) * 10, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, t: 0, r: 8 });
  }

  const enemySpeed = (base) => base * G.diff.speed;

  function updateEnemy(e, dt) {
    e.t += dt;
    if (e.bubble) { e.bubble.t -= dt; if (e.bubble.t <= 0) e.bubble = null; }
    else if ((e.bubbleCd -= dt) <= 0 && onScreen(e) && !e.leaving) { say(e, pick(BUBBLES[e.type])); e.bubbleCd = rand(4, 9); }

    if (e.leaving) {
      e.alpha -= dt * 1.1; e.x -= 170 * dt; e.face = -1; e.moving = true;
      return e.alpha > 0;
    }
    if (e.stun > 0) {
      e.stun -= dt; e.moving = false;
      const k = Math.exp(-6 * dt);
      e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= k; e.vy *= k;
      collideWorld(e);
      return true;
    }
    if (e.state === 'grab') {
      e.st -= dt; e.moving = false;
      if (e.st <= 0) { e.leaving = true; puff(e.x, e.y - 20); }
      return true;
    }
    if (e.type !== 'watcher') {
      if (e.decoy && e.decoy.t <= 0) e.decoy = null;
      if (!e.decoy) for (const d of G.decoyObjs) if (d.t > 0 && dist2(e.x, e.y, d.x, d.y) < 300 * 300) { e.decoy = d; e.state = 'move'; break; }
      if (e.decoy) {
        const d = e.decoy;
        if (dist2(e.x, e.y, d.x, d.y) < 24 * 24) {
          e.state = 'grab'; e.st = 0.75; say(e, pick(DECOY_LINES), 1.4);
          G.grabs++; G.score += 25; floatText(e.x, e.y - 84, '+25', '#ffd23f'); Sound.sfx('grab');
          return true;
        }
        steer(e, d.x, d.y, enemySpeed(e.type === 'fan' ? 135 : 120), dt);
        return true;
      }
    }

    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    const boost = G.alertT > 0 ? 1.5 : 1;
    switch (e.type) {
      case 'fan':
        steer(e, P.x, P.y, enemySpeed(112) * boost, dt);
        break;

      case 'watcher': {
        e.moving = false;
        e.ang = e.baseAng + Math.sin(e.t * 0.9 + e.phase) * 0.72;
        e.face = Math.cos(e.ang) >= 0 ? 1 : -1;
        e.cd -= dt;
        e.seeing = false;
        if (P.shield <= 0 && G.state === 'playing' && d < e.range) {
          let da = Math.atan2(dy, dx) - e.ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < e.half && hasLOS(e.x, e.y, P.x, P.y)) e.seeing = true;
        }
        if (e.seeing) {
          G.alertT = Math.max(G.alertT, 3.2);
          if (e.cd <= 0) {
            e.cd = 5;
            say(e, 'Alvo avistado!', 1.6);
            if (!G.alertHint) { G.alertHint = true; toast('ALVO AVISTADO! AS ESPIÃS ACELERARAM', 'bad', 1.6); }
            Sound.sfx('alert');
            if (countActive() < G.diff.maxEnemies) spawnEnemy('fan', G.camX - 40, rand(FLOOR_TOP + 30, FLOOR_BOT - 20));
          }
        }
        break;
      }

      case 'diner': {
        e.st -= dt;
        if (e.state === 'move') {
          steer(e, P.x, P.y, enemySpeed(80) * (boost > 1 ? 1.35 : 1), dt);
          if (d < 320 && e.st <= 0 && onScreen(e, -20)) {
            e.combo++;
            if (e.combo % 2 === 0) { e.state = 'throwWind'; e.st = 0.45; }
            else { e.state = 'wind'; e.st = 0.62; e.tx = P.x; e.ty = P.y; }
          }
        } else if (e.state === 'wind') {
          e.moving = false;
          e.face = e.tx >= e.x ? 1 : -1;
          if (e.st <= 0) {
            const a = Math.atan2(e.ty - e.y, e.tx - e.x), sp = enemySpeed(520);
            e.dvx = Math.cos(a) * sp; e.dvy = Math.sin(a) * sp;
            e.state = 'dash'; e.st = 0.42;
            Sound.sfx('swoosh');
          }
        } else if (e.state === 'dash') {
          e.x += e.dvx * dt; e.y += e.dvy * dt; e.moving = true;
          if (Math.random() < 0.5) G.particles.push({ kind: 'heart', x: e.x + rand(-6, 6), y: e.y - rand(10, 40), vx: 0, vy: -30, life: 0.5, max: 0.5, size: 7 });
          if (collideWorld(e)) e.st = Math.min(e.st, 0.04);
          if (e.st <= 0) { e.state = 'move'; e.st = 1.3; }
        } else if (e.state === 'throwWind') {
          e.moving = false;
          e.face = dx >= 0 ? 1 : -1;
          if (e.st <= 0) {
            const a = Math.atan2(dy, dx);
            for (const k of [-0.24, 0, 0.24]) shoot(e, 'kiss', a + k, enemySpeed(235));
            e.state = 'move'; e.st = 1.5;
            Sound.sfx('kiss');
          }
        }
        break;
      }

      case 'aide': {
        let tx = P.x, ty = P.y;
        if (d < 210) { tx = e.x - dx; ty = e.y - dy; }
        else if (d < 300) { tx = e.x + (-dy / d) * 60 * e.strafe; ty = e.y + (dx / d) * 60 * e.strafe; }
        steer(e, tx, ty, enemySpeed(95) * (boost > 1 ? 1.35 : 1), dt);
        e.face = dx >= 0 ? 1 : -1;
        e.cd -= dt;
        if (e.cd <= 0 && d < 470 && onScreen(e, -10)) {
          e.cd = rand(1.6, 2.4) / G.diff.speed;
          const lead = (d / 290) * 0.55;
          shoot(e, 'paper', Math.atan2(P.y + P.vy * lead - e.y, P.x + P.vx * lead - e.x), enemySpeed(290));
          Sound.sfx('paper');
        }
        break;
      }

      case 'paparazzi': {
        e.st -= dt; e.cd -= dt;
        e.flashT = Math.max(0, e.flashT - dt);
        if (e.state === 'move') {
          let tx = P.x, ty = P.y;
          if (d < 230) { tx = e.x - dx; ty = e.y - dy; }
          steer(e, tx, ty, enemySpeed(130), dt);
          e.face = dx >= 0 ? 1 : -1;
          if (e.cd <= 0 && d < 380 && onScreen(e, -10)) { e.state = 'aim'; e.st = 0.75; say(e, 'Sorria!', 0.9); }
        } else if (e.state === 'aim') {
          e.moving = false;
          e.face = dx >= 0 ? 1 : -1;
          if (e.st <= 0) {
            e.state = 'move'; e.cd = rand(3.2, 4.4); e.flashT = 0.18;
            Sound.sfx('flash');
            if (d < 430 && P.shield <= 0 && P.dashT <= 0) {
              G.blindT = Math.max(G.blindT, 1.25);
              toast('FLASH! VOCÊ ESTÁ NOS JORNAIS', 'bad', 1.2);
            }
          }
        }
        break;
      }
    }
    return true;
  }

  const countActive = () => G.enemies.reduce((n, e) => n + (e.type !== 'watcher' && !e.leaving ? 1 : 0), 0);

  // ======================================================================
  // EFEITOS
  // ======================================================================
  function burst(x, y, n, color, kind = 'spark') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(60, 220);
      G.particles.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'star' ? 120 : 0), life: rand(0.35, 0.7), max: 0.7, color, size: rand(2, 4) });
    }
  }
  function puff(x, y) {
    for (let i = 0; i < 6; i++) G.particles.push({ kind: 'puff', x: x + rand(-10, 10), y: y + rand(-12, 12), vx: rand(-20, 20), vy: rand(-30, -5), life: 0.6, max: 0.6, size: rand(6, 11) });
  }
  function floatText(x, y, text, color) {
    G.particles.push({ kind: 'text', x, y, vx: 0, vy: -45, life: 0.9, max: 0.9, text, color });
  }
  function shake(t, mag) { G.shakeT = Math.max(G.shakeT, t); G.shakeMag = mag; }

  let toastTimer = null;
  function toast(text, cls = '', dur = 1.6) {
    ui.toast.textContent = text;
    ui.toast.className = 'on ' + cls;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast.className = cls; }, dur * 1000);
  }

  // ======================================================================
  // AÇÕES DO JOGADOR
  // ======================================================================
  function dash() {
    if (G.state !== 'playing' || P.dashCd > 0 || P.dashT > 0) return;
    let [mx, my] = moveInput();
    const m = Math.hypot(mx, my);
    if (m < 0.2) { mx = P.face; my = 0; } else { mx /= m; my /= m; }
    P.dx = mx; P.dy = my; P.dashT = DASH_TIME; P.dashCd = DASH_CD; P.ghostT = 0;
    Sound.sfx('dash');
    burst(P.x, P.y - 10, 6, '#7dff3a');
  }

  function dropDecoy() {
    if (G.state !== 'playing') return;
    if (G.decoys <= 0) { toast('SEM GPU! PEGUE CAIXAS PELO CAMINHO', 'bad', 1.3); Sound.sfx('denied'); return; }
    G.decoys--; G.decoysUsed++;
    const d = { x: clamp(P.x - P.face * 20, G.camX + 24, G.stage.len - 20), y: clamp(P.y + 4, FLOOR_TOP + 18, FLOOR_BOT - 4), t: DECOY_TIME, max: DECOY_TIME };
    G.decoyObjs.push(d);
    for (const e of G.enemies) {
      if (e.type === 'watcher' || e.leaving || e.state === 'grab') continue;
      if (dist2(e.x, e.y, d.x, d.y) < DECOY_RADIUS * DECOY_RADIUS) { e.decoy = d; e.state = 'move'; }
    }
    toast(pick(DECOY_TOASTS), 'gold', 1.6);
    Sound.sfx('decoy');
    burst(d.x, d.y - 14, 10, '#7dff3a');
  }

  function hurt(cause, src) {
    G.lives--; G.hits++;
    G.lastCause = cause;
    G.lastLine = pick(CAUGHT[cause] || CAUGHT.fan);
    P.inv = HURT_INV;
    shake(0.4, 10);
    Sound.sfx('hit');
    if (src) {
      const dx = P.x - src.x, dy = P.y - src.y, m = Math.hypot(dx, dy) || 1;
      P.kbx = (dx / m) * 420; P.kby = (dy / m) * 420;
      if (src.stun !== undefined) knock(src, 260, 1.1);
    }
    burst(P.x, P.y - 40, 14, '#ffd23f', 'star');
    if (G.lives <= 0) {
      G.state = 'dying'; G.dieT = 1.2;
      Sound.stopMusic(); Sound.sfx('over');
      toast('PERDEU A ÚLTIMA JAQUETA', 'bad', 1.3);
    } else {
      toast(G.lastLine, 'bad', 2.2);
    }
  }

  function collect(p) {
    p.dead = true;
    switch (p.kind) {
      case 'chip':
        G.chipCombo = G.chipT > 0 ? G.chipCombo + 1 : 0; G.chipT = 0.6;
        G.chips++; G.score += 10;
        Sound.sfx('chip', G.chipCombo);
        floatText(p.x, p.y - 26, '+10', '#7dff3a');
        burst(p.x, p.y - 12, 4, '#7dff3a');
        break;
      case 'gpu':
        if (G.decoys >= MAX_DECOYS) { G.score += 50; toast('ESTOQUE DE GPU CHEIO · +50', '', 1.2); }
        else {
          G.decoys++;
          toast(G.gotGpuHint ? '+1 GPU' : (isTouch() ? '+1 GPU · TOQUE EM “GPU” PARA DISTRAIR AS ESPIÃS' : '+1 GPU · APERTE E PARA DISTRAIR AS ESPIÃS'), 'gold', G.gotGpuHint ? 1 : 2.4);
          G.gotGpuHint = true;
        }
        Sound.sfx('gpu');
        burst(p.x, p.y - 14, 10, '#7dff3a');
        break;
      case 'memo':
        P.shield = SHIELD_TIME;
        toast('MEMORANDO: “FUI INFIEL… MAS NENHUM SEGREDO VAZOU”', 'gold', 2.2);
        Sound.sfx('power');
        burst(p.x, p.y - 14, 12, '#ffd23f');
        break;
      case 'slam':
        if (G.lives < G.diff.maxLives) { G.lives++; toast('CAFÉ DA MANHÃ COMPLETO! +1 JAQUETA', 'gold', 1.6); }
        else { G.score += 100; toast('BARRIGA CHEIA · +100', 'gold', 1.2); }
        Sound.sfx('life');
        burst(p.x, p.y - 10, 12, '#ff5fa2', 'star');
        break;
    }
  }

  // ======================================================================
  // ATUALIZAÇÃO
  // ======================================================================
  function updatePlayer(dt) {
    const [mx, my] = moveInput();
    P.t += dt;
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.inv = Math.max(0, P.inv - dt);
    if (P.shield > 0) { P.shield -= dt; if (P.shield <= 0) { P.shield = 0; toast('O MEMORANDO PERDEU O EFEITO', 'bad', 1.1); } }
    if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dx * DASH_SPEED; P.vy = P.dy * DASH_SPEED;
      P.ghostT -= dt;
      if (P.ghostT <= 0) { P.ghostT = 0.03; G.particles.push({ kind: 'ghost', x: P.x, y: P.y, face: P.face, t: P.t, life: 0.22, max: 0.22 }); }
    } else {
      P.vx = mx * PLAYER_SPEED; P.vy = my * PLAYER_SPEED * 0.92;
    }
    const k = Math.exp(-9 * dt);
    P.kbx *= k; P.kby *= k;
    P.x += (P.vx + P.kbx) * dt;
    P.y += (P.vy + P.kby) * dt;
    P.moving = Math.abs(P.vx) + Math.abs(P.vy) > 12;
    if (Math.abs(P.vx) > 8) P.face = P.vx > 0 ? 1 : -1;
    for (const o of G.obstacles) if (Math.abs(o.x - P.x) < o.hw + 30) pushOut(P, o);
    P.y = clamp(P.y, FLOOR_TOP + 10, FLOOR_BOT - 4);
    P.x = clamp(P.x, G.camX + 16, G.stage.len - 8);
  }

  function updateCamera() {
    const target = clamp(P.x - 330, 0, G.stage.len - W);
    if (target > G.camX) G.camX = target;
  }

  function updateSpawns(dt) {
    const st = G.stage, d = G.diff;
    let active = countActive();
    while (G.camX + W + 60 >= G.nextAheadX && G.nextAheadX < st.len - 320) {
      const n = Math.random() < st.pairChance ? 2 : 1;
      for (let k = 0; k < n && active < d.maxEnemies; k++) {
        spawnEnemy(pickWeighted(st.spawn), G.nextAheadX + 40 + k * 30, rand(FLOOR_TOP + 24, FLOOR_BOT - 16));
        active++;
      }
      G.nextAheadX += (st.aheadGap / d.spawn) * rand(0.7, 1.3);
    }
    G.behindT -= dt * (G.alertT > 0 ? 2 : 1);
    if (G.behindT <= 0) {
      G.behindT = (st.behindEvery / d.spawn) * rand(0.8, 1.25);
      if (active < d.maxEnemies && G.stageT > 2.5 && P.x < st.len - 400) spawnEnemy('fan', G.camX - 40, rand(FLOOR_TOP + 24, FLOOR_BOT - 16));
    }
  }

  function updateParticles(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      if (p.kind === 'ghost') continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'star') p.vy += 420 * dt;
      else if (p.kind === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
      else if (p.kind === 'puff') p.size += 18 * dt;
    }
    G.particles = G.particles.filter((p) => p.life > 0);
    if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
  }

  function checkHits() {
    const vuln = P.inv <= 0 && P.dashT <= 0;
    for (const e of G.enemies) {
      if (e.leaving || e.state === 'grab' || e.stun > 0 || e.decoy) continue;
      const rs = (P.r + e.r) * 0.85;
      if (dist2(P.x, P.y, e.x, e.y) < rs * rs) {
        if (P.shield > 0) { knock(e, 340, 1); Sound.sfx('bonk'); burst(e.x, e.y - 30, 6, '#ffd23f'); }
        else if (vuln) { hurt(e.type, e); return; }
      }
    }
    for (const p of G.projectiles) {
      if (p.dead) continue;
      const rs = P.r + p.r - 4;
      if (dist2(P.x, P.y, p.x, p.y) < rs * rs) {
        if (P.shield > 0) { p.dead = true; burst(p.x, p.y - 24, 6, '#ffd23f'); }
        else if (vuln) { p.dead = true; hurt(p.kind, p); return; }
      }
    }
  }

  function update(dt) {
    G.t += dt;
    G.shakeT = Math.max(0, G.shakeT - dt);

    if (G.state === 'menu') { G.camX += 70 * dt; return; }
    if (G.state === 'dying') {
      G.dieT -= dt;
      P.spin += dt * 9;
      updateParticles(dt);
      if (G.dieT <= 0) showOver();
      return;
    }
    if (G.state === 'clearing') {
      G.clearT -= dt;
      P.x += 280 * dt; P.moving = true; P.face = 1; P.t += dt;
      G.enemies = G.enemies.filter((e) => updateEnemy(e, dt));
      updateParticles(dt);
      if (G.clearT <= 0) {
        if (G.stageIdx >= STAGES.length - 1) showWin();
        else showCard(G.stageIdx + 1);
      }
      return;
    }
    if (G.state !== 'playing') return;

    G.runTime += dt; G.stageT += dt;
    G.alertT = Math.max(0, G.alertT - dt);
    G.blindT = Math.max(0, G.blindT - dt);
    G.chipT = Math.max(0, G.chipT - dt);

    updatePlayer(dt);
    updateCamera();
    updateSpawns(dt);

    G.enemies = G.enemies.filter((e) => {
      if (e.x < G.camX - 420) return false;
      if (e.type === 'watcher' && (e.x > G.camX + W + 340)) return true; // vigias longe ficam congeladas
      return updateEnemy(e, dt);
    });

    for (const d of G.decoyObjs) {
      d.t -= dt;
      if (d.t <= 0) puff(d.x, d.y - 12);
    }
    G.decoyObjs = G.decoyObjs.filter((d) => d.t > 0);

    for (const p of G.projectiles) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t > 3.5 || p.x < G.camX - 60 || p.x > G.camX + W + 60 || p.y < FLOOR_TOP - 30 || p.y > H + 20 || obstacleAt(p.x, p.y, 0)) p.dead = true;
    }
    G.projectiles = G.projectiles.filter((p) => !p.dead);

    for (const p of G.pickups) {
      if (p.dead || Math.abs(p.x - P.x) > 40) continue;
      const rr2 = p.kind === 'chip' ? 24 : 30;
      if (dist2(P.x, P.y - 4, p.x, p.y) < rr2 * rr2) collect(p);
    }
    G.pickups = G.pickups.filter((p) => !p.dead);

    updateParticles(dt);
    checkHits();

    if (G.state === 'playing' && P.x >= G.stage.len - 70) stageClear();
  }

  // ======================================================================
  // DESENHO — CENÁRIOS
  // ======================================================================
  const STARS = Array.from({ length: 90 }, (_, i) => ({ x: hash(i) * 2400, y: hash(i + 99) * 150, s: hash(i + 7) * 1.6 + 0.4 }));
  const VEINS = Array.from({ length: 14 }, (_, i) => {
    const pts = []; let x = hash(i * 3) * 1200, y = FLOOR_TOP + hash(i * 5 + 1) * (H - FLOOR_TOP);
    for (let k = 0; k < 5; k++) { pts.push([x, y]); x += 20 + hash(i * 11 + k) * 40; y += (hash(i * 13 + k) - 0.5) * 40; }
    return pts;
  });
  let vignette = null;

  function repeatX(cx, k, period, fn) {
    const base = cx * k, off = ((base % period) + period) % period, first = Math.floor(base / period);
    for (let i = -1; i <= Math.ceil(W / period) + 1; i++) fn(i * period - off, first + i);
  }

  function drawScreen(x, y, w, h, idx, t) {
    if (x > W + 10 || x + w < -10) return;
    ctx.fillStyle = '#1b1e26';
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#07240f'); g.addColorStop(1, '#020a05');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#7dff3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const kind = ((idx % 4) + 4) % 4, cx = x + w / 2, cy = y + h / 2;
    if (kind === 0) {
      ctx.font = `900 22px ${TITLE}`;
      ctx.fillText('THE MORE YOU BUY,', cx, cy - 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('THE MORE YOU SAVE', cx, cy + 16);
    } else if (kind === 1) {
      SPR.chip(ctx, cx - 90, cy + 26, t);
      ctx.save(); ctx.translate(cx + 40, cy); ctx.scale(2.6, 2.6); SPR.chip(ctx, 0, 12, t * 0.5); ctx.restore();
      ctx.font = `900 14px ${TITLE}`; ctx.fillText('ACELERADO', cx - 90, cy - 30);
    } else if (kind === 2) {
      for (let i = 0; i < 8; i++) {
        const bh = 14 + i * 9 + Math.sin(t * 2 + i) * 3;
        ctx.fillStyle = i === 7 ? '#ffd23f' : '#7dff3a';
        ctx.fillRect(x + 118 + i * 25, y + h - 14 - bh, 15, bh);
      }
      ctx.font = `900 16px ${TITLE}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
      ctx.fillText('RECEITA', x + 16, cy + 14);
      ctx.fillStyle = '#7dff3a'; ctx.fillText('↑↑↑', x + 16, cy + 36);
    } else {
      ctx.font = `900 34px ${TITLE}`; ctx.fillText('GTC 2026', cx, cy - 10);
      ctx.font = `12px ${FONT}`; ctx.fillStyle = '#c8ffc0'; ctx.fillText('A ERA DA IA COMEÇA AGORA (DE NOVO)', cx, cy + 24);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  function bgKeynote(cx, t) {
    let g = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    g.addColorStop(0, '#04050a'); g.addColorStop(1, '#0f121b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_TOP);
    ctx.fillStyle = '#16181f'; ctx.fillRect(0, 4, W, 6);
    repeatX(cx, 0.6, 520, (x, i) => drawScreen(x + 70, 26, 320, 118, i, t));
    g = ctx.createLinearGradient(0, FLOOR_TOP, 0, H);
    g.addColorStop(0, '#1a1d25'); g.addColorStop(1, '#0b0d12');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1; ctx.beginPath();
    repeatX(cx, 1, 96, (x) => { ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x, H); });
    ctx.stroke();
    ctx.fillStyle = `rgba(125,255,58,${0.55 + 0.25 * Math.sin(t * 3)})`;
    ctx.fillRect(0, FLOOR_TOP - 3, W, 3);
    g = ctx.createLinearGradient(0, FLOOR_TOP, 0, FLOOR_TOP + 70);
    g.addColorStop(0, 'rgba(125,255,58,0.13)'); g.addColorStop(1, 'rgba(125,255,58,0)');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_TOP, W, 70);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const bx = ((i + 0.5) * W) / 3 + Math.sin(t * 0.7 + i * 2) * 120;
      const fx = bx + Math.sin(t * 0.9 + i) * 120, fy = FLOOR_TOP + 150 + Math.sin(t * 0.6 + i * 1.7) * 110;
      g = ctx.createLinearGradient(bx, 0, fx, fy);
      g.addColorStop(0, 'rgba(255,240,200,0.10)'); g.addColorStop(1, 'rgba(255,240,200,0.025)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(bx - 8, 8); ctx.lineTo(bx + 8, 8); ctx.lineTo(fx + 75, fy); ctx.lineTo(fx - 75, fy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.06)';
      ell(ctx, fx, fy, 78, 24); ctx.fill();
    }
    ctx.restore();
  }
  function fgKeynote(cx) {
    repeatX(cx, 1.25, 44, (x, i) => {
      const h = hash(i);
      ctx.fillStyle = '#040507';
      ell(ctx, x, H + 26, 30, 18); ctx.fill();
      ell(ctx, x, H + 2 - h * 6, 17, 20); ctx.fill();
      if (h > 0.74) {
        ctx.fillStyle = 'rgba(150,215,255,0.9)';
        ctx.fillRect(x + 8, H - 36 - h * 8, 7, 11);
        ctx.fillStyle = 'rgba(150,215,255,0.12)';
        ell(ctx, x + 11, H - 31 - h * 8, 16, 16); ctx.fill();
      }
    });
  }

  function bgCampus(cx, t) {
    let g = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    g.addColorStop(0, '#050813'); g.addColorStop(1, '#1d1633');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_TOP);
    for (const s of STARS) {
      const x = ((((s.x - cx * 0.05) % 2400) + 2400) % 2400) - 20;
      if (x > W) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 2 + s.x)})`;
      ctx.fillRect(x, s.y, s.s, s.s);
    }
    repeatX(cx, 0.3, 380, (x, i) => {
      const h1 = 70 + hash(i) * 60, w1 = 220 + hash(i + 3) * 90, top = FLOOR_TOP - 24 - h1;
      ctx.fillStyle = '#0c1020';
      ctx.beginPath(); ctx.moveTo(x, FLOOR_TOP - 20); ctx.lineTo(x + 30, top); ctx.lineTo(x + w1 - 40, top + 18); ctx.lineTo(x + w1, FLOOR_TOP - 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(125,255,58,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const px = x + 30 + k * ((w1 - 70) / 8);
        ctx.moveTo(px, top + 10 + k * 2); ctx.lineTo(px + 14, FLOOR_TOP - 22); ctx.lineTo(px + 28, top + 12 + k * 2);
      }
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        if (hash(i * 7 + k) > 0.55) {
          ctx.fillStyle = hash(i + k) > 0.5 ? 'rgba(125,255,58,0.55)' : 'rgba(255,230,160,0.5)';
          ctx.fillRect(x + 40 + k * ((w1 - 80) / 6), top + 30 + (k % 3) * 18, 8, 5);
        }
      }
    });
    repeatX(cx, 1, 420, (x) => {
      ctx.fillStyle = '#1e2229'; ctx.fillRect(x + 200, 70, 4, FLOOR_TOP - 70);
      ctx.fillStyle = '#ffe9b0'; ell(ctx, x + 202, 68, 7, 4); ctx.fill();
      const lg = ctx.createRadialGradient(x + 202, 70, 0, x + 202, 70, 70);
      lg.addColorStop(0, 'rgba(255,233,176,0.35)'); lg.addColorStop(1, 'rgba(255,233,176,0)');
      ctx.fillStyle = lg; ctx.fillRect(x + 130, 0, 144, 140);
    });
    ctx.fillStyle = '#0d2412'; ctx.fillRect(0, FLOOR_TOP - 26, W, 26);
    repeatX(cx, 1, 46, (x, i) => {
      ctx.fillStyle = hash(i) > 0.5 ? '#15381b' : '#113016';
      ell(ctx, x, FLOOR_TOP - 24, 28, 15); ctx.fill();
    });
    g = ctx.createLinearGradient(0, FLOOR_TOP, 0, H);
    g.addColorStop(0, '#2a2e36'); g.addColorStop(1, '#1b1e24');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    const fh = H - FLOOR_TOP;
    repeatX(cx, 1, 70, (x) => {
      ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x + fh * 0.5, H);
      ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x - fh * 0.5, H);
    });
    ctx.stroke();
  }

  function bgDiner(cx, t) {
    ctx.fillStyle = '#2b191b'; ctx.fillRect(0, 0, W, FLOOR_TOP);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    repeatX(cx, 1, 24, (x) => ctx.fillRect(x, 0, 12, 124));
    repeatX(cx, 1, 300, (x, i) => {
      const wx = x + 50, wy = 22, ww = 190, wh = 86;
      ctx.fillStyle = '#a9afb8'; ctx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, '#081028'); g.addColorStop(1, '#1a2b55');
      ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = hash(i * 9 + k) > 0.5 ? 'rgba(255,214,140,0.7)' : 'rgba(140,200,255,0.6)';
        ctx.fillRect(wx + 8 + k * 20, wy + wh - 18 - hash(i + k) * 26, 3, 3);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.moveTo(wx + 20, wy); ctx.lineTo(wx + 60, wy); ctx.lineTo(wx + 20, wy + wh); ctx.lineTo(wx - 20, wy + wh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a9afb8'; ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      if (i % 3 === 0) {
        const on = Math.sin(t * 13 + i) > -0.85;
        ctx.save();
        ctx.font = `900 20px ${TITLE}`; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff5fa2'; ctx.shadowBlur = on ? 14 : 0;
        ctx.fillStyle = on ? '#ff7ab6' : '#6b2d48';
        ctx.fillText('DINER 24h', wx + ww / 2, wy + 34);
        ctx.shadowColor = '#5ff3ff'; ctx.fillStyle = on ? '#8ff6ff' : '#2d5a63';
        ctx.font = `900 13px ${TITLE}`;
        ctx.fillText('PANQUECAS · CAFÉ', wx + ww / 2, wy + 56);
        ctx.restore();
      }
    });
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(0, 122, W, 4);
    ctx.fillStyle = '#8f1e28'; ctx.fillRect(0, 126, W, FLOOR_TOP - 132);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    repeatX(cx, 1, 40, (x) => ctx.fillRect(x, 126, 2, FLOOR_TOP - 132));
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(0, FLOOR_TOP - 6, W, 6);
    const ts = 40, start = Math.floor(cx / ts), off = cx - start * ts;
    ctx.fillStyle = '#b5ae9f'; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
    ctx.fillStyle = '#1d1a1a';
    for (let i = 0; i <= W / ts + 1; i++) {
      for (let j = 0; j * ts < H - FLOOR_TOP; j++) if ((start + i + j) % 2 === 0) ctx.fillRect(i * ts - off, FLOOR_TOP + j * ts, ts, ts);
    }
    const g = ctx.createLinearGradient(0, FLOOR_TOP, 0, H);
    g.addColorStop(0, 'rgba(20,10,10,0.15)'); g.addColorStop(1, 'rgba(20,10,10,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
  }

  function bgCapitol(cx, t) {
    let g = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    g.addColorStop(0, '#150c27'); g.addColorStop(0.55, '#5a2a46'); g.addColorStop(1, '#d66f45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_TOP);
    repeatX(cx, 0.12, 1300, (x) => {
      const dx = x + 650, by = FLOOR_TOP - 20;
      ctx.fillStyle = '#2c1d36';
      ctx.fillRect(dx - 230, by - 30, 460, 30);
      ctx.fillRect(dx - 80, by - 66, 160, 40);
      ctx.beginPath(); ctx.arc(dx, by - 66, 64, Math.PI, TAU); ctx.fill();
      ctx.fillRect(dx - 10, by - 150, 20, 22);
      ctx.beginPath(); ctx.moveTo(dx - 4, by - 150); ctx.lineTo(dx, by - 166); ctx.lineTo(dx + 4, by - 150); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,122,0.55)';
      for (let k = -3; k <= 3; k++) ctx.fillRect(dx + k * 20 - 2, by - 58, 4, 22);
    });
    ctx.fillStyle = '#d5cebe'; ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = '#b9b2a2'; ctx.fillRect(0, 22, W, 6);
    repeatX(cx, 1, 130, (x) => {
      const gg = ctx.createLinearGradient(x + 40, 0, x + 68, 0);
      gg.addColorStop(0, '#a29b8c'); gg.addColorStop(0.45, '#efe9da'); gg.addColorStop(1, '#a8a192');
      ctx.fillStyle = gg; ctx.fillRect(x + 40, 28, 28, FLOOR_TOP - 42);
      ctx.fillStyle = '#d5cebe'; ctx.fillRect(x + 35, 28, 38, 6); ctx.fillRect(x + 35, FLOOR_TOP - 20, 38, 6);
    });
    ctx.fillStyle = '#b9b2a2'; ctx.fillRect(0, FLOOR_TOP - 14, W, 14);
    g = ctx.createLinearGradient(0, FLOOR_TOP, 0, H);
    g.addColorStop(0, '#8e887d'); g.addColorStop(1, '#5f5a52');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    repeatX(cx, 1, 1200, (x) => {
      ctx.beginPath();
      for (const v of VEINS) { ctx.moveTo(x + v[0][0], v[0][1]); for (const [vx, vy] of v) ctx.lineTo(x + vx, vy); }
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath();
    repeatX(cx, 1, 120, (x) => { ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x, H); });
    ctx.stroke();
    ctx.fillStyle = '#7c1a24'; ctx.fillRect(0, 318, W, 84);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(0, 318, W, 3); ctx.fillRect(0, 399, W, 3);
  }

  const BG = { keynote: bgKeynote, campus: bgCampus, diner: bgDiner, capitol: bgCapitol };

  // portas de saída e casa (coordenadas do mundo)
  function drawExit(st, t) {
    const lineX = st.len - 70;
    if (lineX < G.camX - 200 || lineX - 300 > G.camX + W) return;
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
    ctx.fillStyle = '#7dff3a';
    ctx.font = `900 28px ${TITLE}`; ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) ctx.fillText('›', lineX - 160 + k * 40, (FLOOR_TOP + FLOOR_BOT) / 2 + 10);
    ctx.restore();
    ctx.fillStyle = 'rgba(125,255,58,0.65)';
    for (let y = FLOOR_TOP + 4; y < FLOOR_BOT; y += 22) ctx.fillRect(lineX - 3, y, 6, 12);

    if (st.key === 'capitol') { drawHouse(lineX - 10, t); return; }
    const x = lineX - 60, w = 104, h = 118, y = FLOOR_TOP - h;
    ctx.fillStyle = '#030405'; ctx.fillRect(x, y, w, h);
    let g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(125,255,58,0)'); g.addColorStop(1, 'rgba(125,255,58,0.35)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.shadowColor = '#7dff3a'; ctx.shadowBlur = 14;
    ctx.strokeStyle = '#7dff3a'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    ctx.restore();
    ctx.fillStyle = '#0b0d10'; rr(ctx, x - 26, y - 30, w + 52, 22, 4); ctx.fill();
    ctx.strokeStyle = '#7dff3a'; ctx.lineWidth = 1.5; rr(ctx, x - 26, y - 30, w + 52, 22, 4); ctx.stroke();
    ctx.fillStyle = '#7dff3a'; ctx.font = `900 11px ${TITLE}`; ctx.textAlign = 'center';
    ctx.fillText(st.exit + ' ▸', x + w / 2, y - 15);
    g = ctx.createLinearGradient(0, FLOOR_TOP, 0, FLOOR_TOP + 90);
    g.addColorStop(0, 'rgba(125,255,58,0.22)'); g.addColorStop(1, 'rgba(125,255,58,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x + w, FLOOR_TOP); ctx.lineTo(x + w + 50, FLOOR_TOP + 90); ctx.lineTo(x - 50, FLOOR_TOP + 90); ctx.closePath(); ctx.fill();
  }

  function drawHouse(x, t) {
    const top = 44;
    ctx.fillStyle = '#16161c'; ctx.fillRect(x - 170, 0, 340, FLOOR_TOP);
    ctx.fillStyle = '#3b302b'; ctx.fillRect(x - 140, top, 280, FLOOR_TOP - top);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = top + 10; y < FLOOR_TOP; y += 10) { ctx.moveTo(x - 140, y); ctx.lineTo(x + 140, y); }
    ctx.stroke();
    ctx.fillStyle = '#1d1517';
    ctx.beginPath(); ctx.moveTo(x - 160, top + 4); ctx.lineTo(x, -14); ctx.lineTo(x + 160, top + 4); ctx.closePath(); ctx.fill();
    // janela com a silhueta de braços cruzados
    const wx = x - 112, wy = top + 30;
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(wx, wy, 62, 52);
    ctx.fillStyle = '#2a1b14';
    ell(ctx, wx + 31, wy + 22, 8, 9); ctx.fill();
    ctx.fillRect(wx + 18, wy + 31, 26, 21);
    ctx.fillStyle = '#3b2416'; ctx.fillRect(wx + 14, wy + 36, 34, 6);
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(wx - 3, wy - 3, 68, 4); ctx.fillRect(wx + 29, wy, 4, 52);
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x + 58, wy, 50, 52);
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x + 81, wy, 4, 52);
    // porta
    ctx.fillStyle = '#5e241b'; ctx.fillRect(x - 24, FLOOR_TOP - 84, 48, 84);
    ctx.fillStyle = '#45190f'; ctx.fillRect(x - 18, FLOOR_TOP - 76, 16, 30); ctx.fillRect(x + 2, FLOOR_TOP - 76, 16, 30);
    ctx.fillStyle = '#ffd23f'; ell(ctx, x + 15, FLOOR_TOP - 40, 2.5, 2.5); ctx.fill();
    // luz da varanda
    const g = ctx.createRadialGradient(x + 40, FLOOR_TOP - 66, 0, x + 40, FLOOR_TOP - 66, 90);
    g.addColorStop(0, `rgba(255,214,140,${0.55 + 0.1 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, FLOOR_TOP - 160, 200, 200);
    ctx.fillStyle = '#ffe2a6'; ell(ctx, x + 40, FLOOR_TOP - 66, 4, 5); ctx.fill();
    ctx.fillStyle = '#0b0d10'; rr(ctx, x - 52, FLOOR_TOP - 110, 104, 20, 4); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = `900 11px ${TITLE}`; ctx.textAlign = 'center';
    ctx.fillText('LAR DOCE LAR', x, FLOOR_TOP - 96);
    ctx.fillStyle = '#6b5a3c'; rr(ctx, x - 34, FLOOR_TOP + 6, 68, 18, 3); ctx.fill();
    ctx.fillStyle = '#e8dcc0'; ctx.font = `bold 8px ${FONT}`; ctx.fillText('BEM-VINDO(?)', x, FLOOR_TOP + 18);
  }

  // ======================================================================
  // DESENHO — PERSONAGENS E ITENS
  // ======================================================================
  function drawBubble(x, y, text) {
    ctx.font = `bold 11px ${FONT}`;
    const w = ctx.measureText(text).width + 14, h = 20;
    const bx = clamp(x - w / 2, G.camX + 4, G.camX + W - w - 4), by = Math.max(4, y - h);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    rr(ctx, bx, by, w, h, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(clamp(x - 5, bx + 6, bx + w - 14), by + h - 1); ctx.lineTo(clamp(x + 5, bx + 14, bx + w - 6), by + h - 1); ctx.lineTo(x, by + h + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, by + h / 2 + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  function drawEnemy(e) {
    ctx.globalAlpha = clamp(e.alpha, 0, 1);
    const o = { scale: CS, face: e.face, t: e.t, moving: e.moving, skin: e.skin, hair: e.hair, hat: e.hat, look: e.look, kind: e.type, alert: e.seeing, flash: e.flashT > 0, aim: e.state === 'aim' };
    if (e.type === 'aide') SPR.aide(ctx, e.x, e.y, o);
    else if (e.type === 'paparazzi') SPR.paparazzi(ctx, e.x, e.y, o);
    else SPR.spy(ctx, e.x, e.y, o);
    if (e.stun > 0 && !e.leaving) {
      for (let k = 0; k < 3; k++) {
        const a = e.t * 6 + (k * TAU) / 3;
        ctx.fillStyle = '#ffd23f';
        ell(ctx, e.x + Math.cos(a) * 13, e.y - 84 + Math.sin(a) * 3, 2.4, 2.4); ctx.fill();
      }
    }
    if (e.state === 'wind' || e.state === 'throwWind' || e.state === 'aim') {
      ctx.fillStyle = '#ff3b4e'; ctx.font = `900 18px ${TITLE}`; ctx.textAlign = 'center';
      ctx.fillText('!', e.x, e.y - 88 + Math.sin(e.t * 30) * 1.5);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const blink = P.inv > 0 && P.dashT <= 0 && Math.floor(P.inv * 12) % 2 === 0;
    if (P.shield > 0) {
      const a = 0.25 + 0.12 * Math.sin(G.t * 10);
      const ending = P.shield < 1.2 && Math.floor(P.shield * 8) % 2 === 0;
      if (!ending) {
        ctx.fillStyle = `rgba(255,210,63,${a * 0.5})`;
        ell(ctx, P.x, P.y - 34, 34, 46); ctx.fill();
        ctx.strokeStyle = `rgba(255,210,63,${a + 0.35})`; ctx.lineWidth = 2;
        ell(ctx, P.x, P.y - 34, 34, 46); ctx.stroke();
      }
    }
    ctx.globalAlpha = blink ? 0.3 : 1;
    SPR.jensen(ctx, P.x, P.y, { scale: CS, face: P.face, t: P.t, moving: P.moving, spin: G.state === 'dying' ? P.spin : 0, worried: P.inv > 0 || G.alertT > 0 || G.state === 'dying' });
    ctx.globalAlpha = 1;
  }

  function drawPickup(p) {
    if (p.kind === 'chip') SPR.chip(ctx, p.x, p.y, G.t);
    else if (p.kind === 'gpu') SPR.gpuBox(ctx, p.x, p.y, G.t);
    else if (p.kind === 'memo') SPR.memo(ctx, p.x, p.y, G.t);
    else if (p.kind === 'slam') SPR.slam(ctx, p.x, p.y, G.t);
  }

  function drawDecoy(d) {
    const pulse = 1 + Math.sin(G.t * 12) * 0.05;
    SPR.gpuBox(ctx, d.x, d.y, G.t, 1.25 * pulse, 'GRÁTIS');
    const frac = d.t / d.max;
    ctx.strokeStyle = 'rgba(125,255,58,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(d.x, d.y - 52, 8, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
  }

  const drawList = [];
  function renderWorld() {
    const cam = G.camX, st = G.stage;
    drawExit(st, G.t);

    // marcas no chão: cones de visão, isca, avisos de investida
    for (const e of G.enemies) {
      if (e.type === 'watcher' && onScreen(e, e.range)) {
        const col = e.seeing ? '255,59,78' : '255,210,63';
        const g = ctx.createRadialGradient(e.x, e.y - 4, 10, e.x, e.y - 4, e.range);
        g.addColorStop(0, `rgba(${col},${e.seeing ? 0.4 : 0.24})`); g.addColorStop(1, `rgba(${col},0.02)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(e.x, e.y - 4); ctx.arc(e.x, e.y - 4, e.range, e.ang - e.half, e.ang + e.half); ctx.closePath(); ctx.fill();
      }
      if (e.type === 'diner' && e.state === 'wind') {
        const a = Math.atan2(e.ty - e.y, e.tx - e.x), L = 520 * G.diff.speed * 0.42;
        ctx.save();
        ctx.setLineDash([8, 7]); ctx.lineDashOffset = -G.t * 60;
        ctx.strokeStyle = 'rgba(255,79,151,0.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * L, e.y + Math.sin(a) * L); ctx.stroke();
        ctx.restore();
      }
    }
    for (const d of G.decoyObjs) {
      ctx.strokeStyle = `rgba(125,255,58,${0.12 + 0.1 * Math.sin(G.t * 8)})`; ctx.lineWidth = 2;
      ell(ctx, d.x, d.y, 300, 300 * 0.5); ctx.stroke();
    }

    drawList.length = 0;
    const vis = (x, pad) => x > cam - pad && x < cam + W + pad;
    for (const o of G.obstacles) if (vis(o.x, o.hw + 40)) drawList.push([o.y + o.hh, 0, o]);
    for (const p of G.pickups) if (vis(p.x, 30)) drawList.push([p.y, 1, p]);
    for (const e of G.enemies) if (vis(e.x, 40)) drawList.push([e.y, 2, e]);
    for (const d of G.decoyObjs) drawList.push([d.y, 3, d]);
    drawList.push([P.y + 0.1, 4, P]);
    drawList.sort((a, b) => a[0] - b[0]);

    for (const p of G.particles) if (p.kind === 'ghost') {
      ctx.globalAlpha = (p.life / p.max) * 0.35;
      SPR.jensen(ctx, p.x, p.y, { scale: CS, face: p.face, t: p.t, moving: true, noShadow: true });
    }
    ctx.globalAlpha = 1;

    for (const [, k, o] of drawList) {
      if (k === 0) SPR.obstacle(ctx, o, G.t);
      else if (k === 1) drawPickup(o);
      else if (k === 2) drawEnemy(o);
      else if (k === 3) drawDecoy(o);
      else drawPlayer();
    }

    for (const p of G.projectiles) {
      SPR.shadow(ctx, p.x, p.y + 2, 6, 2.2, 0.25);
      if (p.kind === 'kiss') SPR.kiss(ctx, p.x, p.y - 26, G.t + p.x);
      else SPR.paper(ctx, p.x, p.y - 26, p.t);
    }

    for (const p of G.particles) {
      if (p.kind === 'ghost') continue;
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'text') {
        ctx.fillStyle = p.color; ctx.font = `900 13px ${TITLE}`; ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'heart') SPR.heart(ctx, p.x, p.y, p.size, '#ff4f97');
      else if (p.kind === 'puff') { ctx.fillStyle = 'rgba(200,200,200,0.5)'; ell(ctx, p.x, p.y, p.size, p.size); ctx.fill(); }
      else if (p.kind === 'star') { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      else { ctx.fillStyle = p.color; ell(ctx, p.x, p.y, p.size * 0.7, p.size * 0.7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    for (const e of G.enemies) if (e.bubble && vis(e.x, 0)) drawBubble(e.x, e.y - 90, e.bubble.text);
  }

  function renderAttract() {
    const cx = G.camX, t = G.t;
    bgKeynote(cx, t);
    const y = 400;
    const chasers = [
      { x: 690, y: 380, kind: 'fan', skin: SPY_SKINS[0], hair: SPY_HAIRS[0], look: 0 },
      { x: 625, y: 430, kind: 'diner', skin: SPY_SKINS[2], hair: SPY_HAIRS[1], look: 0 },
      { x: 570, y: 360, kind: 'fan', skin: SPY_SKINS[3], hair: SPY_HAIRS[3], look: 5 },
    ];
    for (const c of chasers) SPR.spy(ctx, c.x + Math.sin(t * 1.3 + c.x) * 10, c.y, { scale: 1.2, face: 1, t: t + c.x, moving: true, kind: c.kind, skin: c.skin, hair: c.hair, look: c.look });
    SPR.jensen(ctx, 830 + Math.sin(t * 1.1) * 12, y, { face: 1, t, moving: true, worried: true, scale: 1.4 });
    SPR.chip(ctx, 905, y - 10, t);
    fgKeynote(cx);
  }

  function render() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textAlign = 'left';
    if (G.state === 'menu') {
      renderAttract();
    } else {
      let sx = 0, sy = 0;
      if (G.shakeT > 0) { const m = G.shakeMag * (G.shakeT / 0.4); sx = rand(-m, m); sy = rand(-m, m); }
      ctx.save();
      ctx.translate(sx, sy);
      BG[G.stage.key](G.camX, G.t);
      ctx.save();
      ctx.translate(-Math.round(G.camX), 0);
      renderWorld();
      ctx.restore();
      if (G.stage.key === 'keynote') fgKeynote(G.camX);
      ctx.restore();
    }

    if (!vignette) {
      vignette = ctx.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 620);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    }
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

    if (G.alertT > 0 && G.state === 'playing') {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.t * 14);
      ctx.strokeStyle = '#ff2040'; ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, W, H);
      ctx.restore();
    }
    if (G.blindT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.blindT / 1.25) * 0.94})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (joy.active && G.state === 'playing') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
      ell(ctx, joy.ox, joy.oy, 56, 56); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ell(ctx, joy.ox + joy.kx, joy.oy + joy.ky, 24, 24); ctx.fill();
    }
    if (DEBUG) renderDebug();
  }

  let fps = 60;
  function renderDebug() {
    ctx.save();
    if (G.state !== 'menu') {
      ctx.translate(-Math.round(G.camX), 0);
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 1;
      ell(ctx, P.x, P.y, P.r, P.r); ctx.stroke();
      ctx.strokeStyle = '#f0f';
      for (const e of G.enemies) { ell(ctx, e.x, e.y, e.r, e.r); ctx.stroke(); }
      ctx.strokeStyle = '#ff0';
      for (const o of G.obstacles) ctx.strokeRect(o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2);
    }
    ctx.restore();
    ctx.fillStyle = '#0f0'; ctx.font = `12px monospace`; ctx.textAlign = 'left';
    ctx.fillText(`${fps.toFixed(0)} fps · ${G.state} · x ${P.x.toFixed(0)}/${G.stage.len} · inimigas ${G.enemies.length} · part ${G.particles.length}`, 10, H - 10);
  }

  // ======================================================================
  // HUD
  // ======================================================================
  const JACKET = '<svg viewBox="0 0 32 28" aria-hidden="true"><path d="M11 2l5 4 5-4 7 3 3 10-4 1.5V26H5V16.5L1 15 4 5z" fill="#121316" stroke="#7dff3a" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 6v20M11 2l3 9M21 2l-3 9" stroke="#7dff3a" stroke-width="1" fill="none" opacity=".8"/></svg>';
  const hudCache = {};
  function setIf(key, val, fn) { if (hudCache[key] !== val) { hudCache[key] = val; fn(val); } }

  function updateHUD() {
    const playingish = G.state !== 'menu';
    setIf('hudOff', !playingish, (v) => ui.hud.classList.toggle('off', v));
    setIf('playing', G.state === 'playing', (v) => frame.classList.toggle('playing', v));
    setIf('alert', G.state === 'playing' && G.alertT > 0, (v) => document.body.classList.toggle('alert', v));
    if (!playingish) return;
    setIf('lives', G.lives + '/' + G.diff.maxLives, () => {
      const prev = hudCache.livesN === undefined ? G.lives : hudCache.livesN;
      let html = '';
      for (let k = 0; k < G.diff.maxLives; k++) html += JACKET;
      ui.lives.innerHTML = html;
      [...ui.lives.children].forEach((el, k) => {
        if (k >= G.lives) el.classList.add('off');
        if (k === G.lives && prev > G.lives) el.classList.add('lost');
      });
      hudCache.livesN = G.lives;
    });
    setIf('chips', G.chips, (v) => { ui.chips.textContent = v; });
    setIf('gpus', G.decoys, (v) => { ui.gpus.textContent = '×' + v; ui.gpuSmall.textContent = '×' + v; ui.btnGpu.classList.toggle('empty', v <= 0); });
    const frac = 1 - P.dashCd / DASH_CD;
    setIf('turbo', Math.round(frac * 40), () => {
      ui.turboBar.style.width = frac * 100 + '%';
      ui.turbo.classList.toggle('ready', frac >= 1);
      ui.dashRing.style.strokeDashoffset = String(289 * (1 - frac));
      ui.btnDash.classList.toggle('cool', frac < 1);
    });
    setIf('shield', P.shield > 0, (v) => ui.shield.classList.toggle('on', v));
    const prog = (G.stageIdx + clamp(P.x / (G.stage.len - 70), 0, 1)) / STAGES.length;
    setIf('prog', Math.round(prog * 400), () => {
      ui.progFill.style.width = prog * 100 + '%';
      ui.progDot.style.left = prog * 100 + '%';
    });
    setIf('stage', G.stageIdx, (v) => {
      ui.progLabel.textContent = STAGES[v].kicker;
      ui.tickLabels.forEach((el, k) => el.classList.toggle('cur', k === v));
    });
  }

  function toggleMute() {
    Sound.ensure();
    const m = Sound.toggleMute();
    ui.btnMute.textContent = m ? '🔇' : '🔊';
    if (G.state === 'playing') toast(m ? 'SOM DESLIGADO' : 'SOM LIGADO', '', 0.8);
  }

  // ======================================================================
  // FLUXO DE TELAS
  // ======================================================================
  function startRun() {
    Sound.ensure();
    Sound.sfx('click');
    G.diff = DIFFS[G.diffKey];
    G.lives = G.diff.lives; G.chips = 0; G.score = 0; G.decoys = G.diff.decoys; G.decoysUsed = 0; G.grabs = 0; G.hits = 0;
    G.runTime = 0; G.gotGpuHint = false;
    for (const k in hudCache) delete hudCache[k];
    showCard(START_STAGE);
  }

  function showCard(i) {
    loadStage(i);
    G.state = 'card';
    Sound.stopMusic();
    const st = STAGES[i];
    ui.cardKicker.textContent = st.kicker;
    ui.cardHeadline.textContent = st.headline;
    ui.cardTip.textContent = isTouch() && st.tipTouch ? st.tipTouch : st.tip;
    ui.cardEdition.textContent = `EDIÇÃO EXTRA · Nº ${i + 1}`;
    showOverlay('card');
  }

  function go() {
    if (G.state !== 'card') return;
    if (portraitQ.matches) return;
    Sound.ensure();
    Sound.sfx('click');
    showOverlay(null);
    G.state = 'playing';
    Sound.startMusic(G.stageIdx);
  }

  function pause() {
    if (G.state !== 'playing') return;
    G.state = 'paused';
    joy.id = null; joy.active = false; joy.dx = joy.dy = 0;
    Sound.stopMusic();
    showOverlay('pause');
  }
  function resume() {
    if (G.state !== 'paused' || portraitQ.matches) return;
    Sound.ensure();
    showOverlay(null);
    G.state = 'playing';
    Sound.startMusic(G.stageIdx);
  }

  function stageClear() {
    G.state = 'clearing';
    G.clearT = 0.9;
    G.score += 250;
    Sound.stopMusic();
    Sound.sfx('clear');
    floatText(P.x, P.y - 80, '+250', '#7dff3a');
    toast(G.stageIdx >= STAGES.length - 1 ? 'CHEGOU EM CASA!' : 'FASE CONCLUÍDA · +250', '', 1);
    G.enemies.forEach((e) => { if (e.type !== 'watcher') e.leaving = true; });
    G.projectiles = [];
  }

  function rankFor(score) {
    let r = RANKS[0][1];
    for (const [min, name] of RANKS) if (score >= min) r = name;
    return r;
  }
  function saveBest(score) {
    const best = store.get('best', 0);
    if (score > best) { store.set('best', score); return true; }
    return false;
  }
  function statsHTML(items) { return items.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join(''); }

  function showOver() {
    G.state = 'over';
    const prog = Math.round(((G.stageIdx + clamp(P.x / (G.stage.len - 70), 0, 1)) / STAGES.length) * 100);
    const final = Math.round(G.score * G.diff.mult);
    const record = saveBest(final);
    ui.overQuote.textContent = G.lastLine;
    ui.overNote.textContent = pick(OVER_NOTES);
    ui.overStats.innerHTML = statsHTML([
      ['FASE', G.stage.name], ['CAMINHO', prog + '%'], ['CHIPS', G.chips], [record ? 'NOVO RECORDE' : 'PONTOS', fmtInt(final)],
    ]);
    G.shareText = `Fui pego na fase ${G.stage.name} do Corre, Jensen! (${prog}% do caminho, ${G.chips} chips) 🧥🏃 Duvido você chegar mais longe:`;
    updateBest();
    showOverlay('over');
  }

  function showWin() {
    G.state = 'won';
    const timeBonus = Math.max(0, Math.round((240 - G.runTime) * 6));
    const lifeBonus = G.lives * 200;
    const final = Math.round((G.score + timeBonus + lifeBonus) * G.diff.mult);
    const record = saveBest(final);
    ui.winRank.innerHTML = `<small>SEU CARGO</small>${rankFor(final)}`;
    ui.winStats.innerHTML = statsHTML([
      ['TEMPO', fmtTime(G.runTime)], ['CHIPS', G.chips], ['JAQUETAS', G.lives], ['GPUs USADAS', G.decoysUsed], [record ? 'NOVO RECORDE' : 'PONTOS', fmtInt(final)],
    ]);
    G.shareText = `Fugi das espiãs em ${fmtTime(G.runTime)} e fiz ${fmtInt(final)} pontos no Corre, Jensen! (${G.diff.label}) 🧥🏃 Cargo: ${rankFor(final)}. Duvido você:`;
    updateBest();
    Sound.sfx('win');
    showOverlay('win');
  }

  function backToMenu() {
    Sound.stopMusic();
    G.state = 'menu';
    G.stage = STAGES[0];
    showOverlay('menu');
  }

  function updateBest() {
    const b = store.get('best', 0);
    ui.best.textContent = b > 0 ? fmtInt(b) + ' pts' : '—';
  }

  // ======================================================================
  // COMPARTILHAR
  // ======================================================================
  function shareUrl() {
    if (SITE_URL) return SITE_URL;
    if (location.protocol.startsWith('http')) return location.origin + location.pathname.replace(/index\.html$/, '');
    return '';
  }
  function copyText(text) {
    const done = () => toast('COPIADO!', '', 1);
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); }
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* sem cópia */ }
    ta.remove();
  }
  function doShare(kind) {
    const url = shareUrl(), text = G.shareText, full = url ? `${text} ${url}` : text;
    Sound.sfx('click');
    if (kind === 'native' && navigator.share) navigator.share({ title: 'Corre, Jensen!', text, url: url || undefined }).catch(() => { });
    else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(full), '_blank', 'noopener');
    else if (kind === 'gh') window.open(REPO_URL, '_blank', 'noopener');
    else copyText(full);
  }
  document.querySelectorAll('.share').forEach((box) => {
    const btns = [['native', 'COMPARTILHAR'], ['wa', 'WHATSAPP'], ['gh', 'GITHUB'], ['copy', 'COPIAR']];
    for (const [k, label] of btns) {
      if (k === 'native' && !navigator.share) continue;
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', () => doShare(k));
      box.appendChild(b);
    }
  });

  // ======================================================================
  // BOTÕES
  // ======================================================================
  const diffBtns = document.querySelectorAll('.diffs button');
  function setDiff(k) {
    G.diffKey = k; store.set('diff', k);
    diffBtns.forEach((b) => { b.classList.toggle('on', b.dataset.diff === k); b.setAttribute('aria-checked', b.dataset.diff === k); });
  }
  diffBtns.forEach((b) => { b.setAttribute('role', 'radio'); b.addEventListener('click', () => { setDiff(b.dataset.diff); Sound.ensure(); Sound.sfx('click'); }); });
  setDiff(G.diffKey);

  $('btn-start').addEventListener('click', startRun);
  $('btn-go').addEventListener('click', go);
  $('btn-resume').addEventListener('click', resume);
  $('btn-quit').addEventListener('click', backToMenu);
  $('btn-retry').addEventListener('click', startRun);
  $('btn-again').addEventListener('click', startRun);
  $('btn-menu1').addEventListener('click', backToMenu);
  $('btn-menu2').addEventListener('click', backToMenu);
  ui.btnPause.addEventListener('click', () => { if (G.state === 'playing') pause(); else resume(); });
  ui.btnMute.addEventListener('click', toggleMute);
  ui.btnMute.textContent = Sound.isMuted() ? '🔇' : '🔊';

  const fsBtn = $('btn-fs');
  const root = document.documentElement;
  const reqFs = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!reqFs || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) fsBtn.style.display = 'none';
  fsBtn.addEventListener('click', () => {
    try {
      const p = reqFs.call(root);
      const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { /* ok */ } };
      if (p && p.then) p.then(lock).catch(() => { }); else lock();
    } catch (e) { /* ok */ }
  });

  // ======================================================================
  // LAÇO PRINCIPAL
  // ======================================================================
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  updateBest();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;
    update(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  if (DEBUG) {
    window.__cj = {
      G, P, startRun, go, dash, dropDecoy, pause, resume, stageClear, backToMenu, setDiff,
      hurt: () => hurt('fan', null),
      teleport: (x, y) => { P.x = x; if (y !== undefined) P.y = y; },
      tick: (dt = 1 / 60) => update(dt),
      step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n; i++) update(dt); render(); updateHUD(); },
    };
  }
})();
