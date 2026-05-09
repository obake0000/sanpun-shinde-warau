'use strict';

const TOTAL_SEC = 90;
const SPAWN_INT_BY_STAGE = { birth: 1000, school: 850, work: 600, old: 700, tomb: 500 };
const FALL_SPEED = 110;
const FALL_SPEED_RAMP = 1.5;
const ITEM_SIZE = 56;
const PROTAG_W = 80;
const PROTAG_H = 100;
const INVULN_TICKS = 60; // 衝突後の無敵フレーム数(60fpsで1秒)
const PROTAG_MAX_SPEED = 7.5; // px/frame で滑らかに追従(ワープ禁止)

const $ = id => document.getElementById(id);
const log = msg => console.log(`[GAME] ${msg}`);

const state = {
  remain: TOTAL_SEC,
  lives: INITIAL_LIVES,
  hits: 0,
  deathTags: [],
  stageIndex: 0,
  running: false,
  modalOpen: false,
  protagX: 0,
  dragging: false,
  fieldW: 0, fieldH: 0,
  items: [],
  rafId: null,
  lastFrame: 0,
  lastSpawn: 0,
  invulnFrames: 0,
  prologueIdx: 0,
  godHideTimer: null,
  spawnPaused: false,
  pendingDeath: null,
  pendingEnding: null,
  endingKind: null,
  tickHandle: null,
  waveIdx: 0,
  waveActive: false,
  waveSpawnsLeft: 0,
  waveSpawnTimer: null,
  guaranteedHealDone: false,
  targetX: null,
};

// === 初期化 ===
function init() {
  $('startBtn').addEventListener('click', () => { Sound.unlock(); showOpening(); });
  $('skipBtn').addEventListener('click', showPrologue);
  $('tapToStart').addEventListener('click', () => { Sound.unlock(); playOpeningVideo(); });
  $('openingVideo').addEventListener('ended', showPrologue);
  $('prologueStage').addEventListener('click', () => { Sound.tap(); advancePrologue(); });
  $('prologueSkip').addEventListener('click', e => { e.stopPropagation(); Sound.tap(); showMission(); });
  $('missionBtn').addEventListener('click', () => { Sound.choice(); startGame(); });
  $('retryBtn').addEventListener('click', () => location.reload());
  $('shareBtn').addEventListener('click', share);
  $('muteBtn').addEventListener('click', () => {
    Sound.unlock();
    const muted = Sound.toggleMute();
    $('muteBtn').textContent = muted ? '🔇' : '🔊';
    $('muteBtn').classList.toggle('muted', muted);
  });
  log('初期化完了');
}

// === オープニング ===
function showOpening() {
  $('title').hidden = true;
  $('opening').hidden = false;
  $('tapToStart').classList.remove('hidden');
}
function playOpeningVideo() {
  $('tapToStart').classList.add('hidden');
  const v = $('openingVideo');
  v.muted = false;
  v.play().catch(() => { v.muted = true; v.play().catch(() => showPrologue()); });
}

// === プロローグ ===
function showPrologue() {
  $('opening').hidden = true;
  $('openingVideo').pause();
  $('prologue').hidden = false;
  state.prologueIdx = 0;
  renderPrologueLine();
}
function renderPrologueLine() {
  const line = PROLOGUE[state.prologueIdx];
  if (!line) return;
  $('prologueAvatar').textContent = line.avatar;
  if (line.godImg) $('prologueAvatarImg').src = `img/${line.godImg}.png`;
  $('prologueSpeaker').textContent = line.speaker;
  $('prologueText').textContent = '';
  let i = 0;
  const typing = setInterval(() => {
    $('prologueText').textContent = line.text.slice(0, ++i);
    if (i >= line.text.length) clearInterval(typing);
  }, 30);
  $('prologueArrow').style.visibility = 'visible';
}
function advancePrologue() {
  const line = PROLOGUE[state.prologueIdx];
  if (!line) return;
  if ($('prologueText').textContent.length < line.text.length) {
    $('prologueText').textContent = line.text;
    return;
  }
  state.prologueIdx++;
  if (state.prologueIdx >= PROLOGUE.length) { showMission(); return; }
  renderPrologueLine();
}
function showMission() {
  $('prologueArrow').style.visibility = 'hidden';
  $('missionCard').hidden = false;
}

// === ゲーム開始 ===
function startGame() {
  log('一生編 開始');
  $('prologue').hidden = true;
  $('game').hidden = false;
  state.running = true;
  state.lives = INITIAL_LIVES;
  state.hits = 0;
  state.deathTags = [];
  state.stageIndex = 0;
  state.invulnFrames = 0;
  state.waveIdx = 0;
  state.waveActive = false;
  state.guaranteedHealDone = false;
  const field = $('fallingArea');
  state.fieldW = field.clientWidth;
  state.fieldH = field.clientHeight;
  state.protagX = state.fieldW / 2;
  setupPointerControls();
  updateProtagonist();
  updateLives();
  updateStage();
  state.tickHandle = setInterval(tick, 1000);
  state.lastFrame = performance.now();
  state.lastSpawn = state.lastFrame;
  state.rafId = requestAnimationFrame(frame);
  updateTimer();
  Sound.startBgm();
  showStageBanner(0);
}

function setupPointerControls() {
  const field = $('fallingArea');
  let lastPointerX = null;
  const onDown = e => {
    state.dragging = true;
    field.classList.add('dragging');
    if (e.pointerId !== undefined) field.setPointerCapture(e.pointerId);
    lastPointerX = getX(e);
    // 押した瞬間は動かない(クリックで獲得禁止)
  };
  const onMove = e => {
    if (!state.dragging) return;
    const x = getX(e);
    const delta = x - lastPointerX;
    lastPointerX = x;
    // 指の動き量だけ主人公を相対移動
    if (state.targetX == null) state.targetX = state.protagX;
    state.targetX += delta;
    state.targetX = Math.max(PROTAG_W/2, Math.min(state.fieldW - PROTAG_W/2, state.targetX));
  };
  const onUp = () => { state.dragging = false; field.classList.remove('dragging'); lastPointerX = null; };
  field.onpointerdown = onDown;
  field.onpointermove = onMove;
  field.onpointerup = onUp;
  field.onpointercancel = onUp;
}
function getX(e) {
  const rect = $('fallingArea').getBoundingClientRect();
  return (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
}
function moveProtagTowardTarget() {
  if (state.targetX == null) return;
  const half = PROTAG_W / 2;
  const target = Math.max(half, Math.min(state.fieldW - half, state.targetX));
  const diff = target - state.protagX;
  if (Math.abs(diff) <= PROTAG_MAX_SPEED) state.protagX = target;
  else state.protagX += Math.sign(diff) * PROTAG_MAX_SPEED;
  updateProtagonist();
}
function updateProtagonist() {
  const p = $('protagonist');
  p.style.left = state.protagX + 'px';
  p.style.transform = 'translateX(-50%)';
  const glow = $('protagonistGlow');
  if (glow) glow.style.left = state.protagX + 'px';
  const ring = $('hitRing');
  if (ring) ring.style.left = state.protagX + 'px';
  // 段階別スプライト
  const stage = STAGES[state.stageIndex];
  const map = { birth:'baby_crawl', school:'classmate_study', work:'sara_run', old:'oldman_despair', tomb:'oldman_despair' };
  const imgKey = map[stage.id] || 'baby_crawl';
  if (!p.src.endsWith(imgKey + '.png')) p.src = `img/${imgKey}.png`;
}

// === ステージ ===
function updateStage() {
  const stage = STAGES[state.stageIndex];
  $('stageLabel').textContent = `${stage.emoji} ${stage.name}編`;
  $('stageChapter').textContent = stage.chapter;
  // 背景画像をステージに応じて切替
  const bgMap = {
    birth:  'bg_phase1',
    school: 'bg_phase1',
    work:   'bg_phase2',
    old:    'bg_phase3',
    tomb:   'bg_phase3',
  };
  const bgKey = bgMap[stage.id];
  const fa = $('fallingArea');
  if (bgKey) {
    fa.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url(img/${bgKey}.png)`;
    fa.style.backgroundSize = 'cover';
    fa.style.backgroundPosition = 'center';
    fa.style.backgroundRepeat = 'no-repeat';
  }
  $('scene').style.background = `linear-gradient(180deg, ${stage.bg}, #000)`;
}

function updateAge() {
  const stage = STAGES[state.stageIndex];
  const elapsed = TOTAL_SEC - state.remain;
  const t = Math.min(1, Math.max(0, (elapsed - stage.from) / (stage.to - stage.from)));
  const age = Math.floor(stage.ageFrom + t * (stage.ageTo - stage.ageFrom));
  $('ageLabel').textContent = `${age}歳`;
}

function showStageBanner(idx) {
  const s = STAGES[idx];
  const b = $('stageBanner');
  $('sbChapter').textContent = s.chapter;
  $('sbTitle').textContent = `${s.emoji} ${s.name}編`;
  $('sbAge').textContent = `${s.ageFrom}歳〜`;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  Sound.modalOpen();
  setTimeout(() => b.classList.remove('show'), 2200);
}

// === ティック ===
function tick() {
  if (!state.running || state.modalOpen) return;
  state.remain--;
  updateTimer();
  updateAge();
  if (state.remain === 15) Sound.startWarning();
  // ステージ遷移
  const elapsed = TOTAL_SEC - state.remain;
  for (let i = state.stageIndex + 1; i < STAGES.length; i++) {
    if (elapsed >= STAGES[i].from) {
      state.stageIndex = i;
      updateStage();
      updateProtagonist();
      showStageBanner(i);
      break;
    }
  }
  // ボスwave発動
  if (state.waveIdx < WAVES.length) {
    const w = WAVES[state.waveIdx];
    if (elapsed >= w.time && !state.waveActive && !state.modalOpen) {
      state.waveIdx++;
      triggerWave(w);
    }
  }
  // 保証ヒール: 一生に一度の幸運(GUARANTEED_HEAL_TIME秒経過時)
  if (!state.guaranteedHealDone && elapsed >= GUARANTEED_HEAL_TIME && !state.modalOpen && !state.waveActive) {
    state.guaranteedHealDone = true;
    const heal = pick(HEAL_ITEMS);
    spawnHealFromDef(heal);
    // 小さなトースト「✨ 一生に一度の幸運」
    flashLuckyHint();
  }
  // 早死に判定
  if (state.lives <= 0) {
    state.remain = 0;
    updateTimer();
    endGame(true); // 早死に
    return;
  }
  if (state.remain <= 0) {
    state.remain = 0;
    updateTimer();
    endGame(false);
  }
}

function updateTimer() {
  const m = Math.floor(state.remain / 60);
  const s = state.remain % 60;
  $('timer').textContent = `${m}:${String(s).padStart(2,'0')}`;
  $('timer').classList.toggle('warn', state.remain <= 15);
}

function updateLives() {
  const wrap = $('livesDisplay');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < INITIAL_LIVES; i++) {
    const h = document.createElement('span');
    h.className = 'life ' + (i < state.lives ? 'on' : 'off');
    h.textContent = i < state.lives ? '❤' : '🖤';
    wrap.appendChild(h);
  }
}

function applyStageVisuals() {
  // 神の手段階別 (人生の段階で変化)
  const handImg = $('handImg');
  const stage = STAGES[state.stageIndex];
  const map = { birth:'hand_holy', school:'hand_holy', work:'hand_point', old:'hand_bloody', tomb:'hand_skull' };
  const key = map[stage.id] || 'hand_holy';
  if (!handImg.src.endsWith(key + '.png')) {
    handImg.src = `img/${key}.png`;
    handImg.classList.add('shake');
    setTimeout(() => handImg.classList.remove('shake'), 600);
  }
}

// === フレームループ ===
function frame(now) {
  if (!state.running) return;
  if (state.modalOpen) {
    state.lastFrame = now;
    state.lastSpawn = now;
    state.rafId = requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(50, now - state.lastFrame) / 1000;
  state.lastFrame = now;
  if (state.invulnFrames > 0) state.invulnFrames--;
  applyStageVisuals();
  moveProtagTowardTarget();

  // スポーン
  const stage = STAGES[state.stageIndex];
  const spawnInt = SPAWN_INT_BY_STAGE[stage.id] || 800;
  if (!state.spawnPaused && now - state.lastSpawn > spawnInt) {
    state.lastSpawn = now;
    spawnItem();
  }

  // 落下＋衝突
  const speed = FALL_SPEED * speedMultiplier();
  const protagCx = state.protagX;
  const protagCy = state.fieldH - 50;
  state.items = state.items.filter(item => {
    if (item.consumed) return false;
    item.y += speed * dt;
    item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
    const itemCx = item.x + ITEM_SIZE / 2;
    const itemCy = item.y + ITEM_SIZE / 2;
    const dx = itemCx - protagCx;
    const dy = itemCy - protagCy;
    if (state.invulnFrames === 0 && dx*dx + dy*dy < 32 * 32) {
      collide(item);
      return true;
    }
    if (item.y > state.fieldH + 10) {
      item.el.remove();
      return false;
    }
    return true;
  });

  state.rafId = requestAnimationFrame(frame);
}

function speedMultiplier() {
  const elapsed = TOTAL_SEC - state.remain;
  return 1 + (elapsed / TOTAL_SEC) * (FALL_SPEED_RAMP - 1);
}

// === スポーン ===
function pickObstacle() {
  const stage = STAGES[state.stageIndex];
  const pool = OBSTACLES.filter(o => o.stage === stage.id);
  return pool[Math.floor(Math.random() * pool.length)] || OBSTACLES[0];
}

function spawnItem() {
  // 社畜以降は回復アイテム7%確率
  if (state.stageIndex >= 2 && Math.random() < 0.07) {
    const heal = pick(HEAL_ITEMS);
    spawnHealFromDef(heal);
    return;
  }
  const def = pickObstacle();
  spawnItemFromDef(def);
}

function spawnHealFromDef(def) {
  const x = Math.random() * (state.fieldW - ITEM_SIZE - 8) + 4;
  const el = document.createElement('div');
  el.className = 'fall-item heal with-sprite';
  if (def.sprite) {
    const img = document.createElement('img');
    img.src = `img/${def.sprite}.png`;
    el.appendChild(img);
  }
  const lbl = document.createElement('span');
  lbl.className = 'fi-label heal';
  lbl.textContent = def.label;
  el.appendChild(lbl);
  el.style.transform = `translate(${x}px, -${ITEM_SIZE + 10}px)`;
  $('fallingArea').appendChild(el);
  state.items.push({ def, isHeal:true, x, y: -ITEM_SIZE - 10, el, consumed:false });
}

// === ボスwave ===
function triggerWave(w) {
  log(`WAVE: ${w.name}`);
  state.waveActive = true;
  Sound.modalOpen();
  setTimeout(() => Sound.endHell(), 200);
  flashBossAppear(w);
  // 小さめのバナー (画面邪魔しない)
  const b = $('stageBanner');
  $('sbChapter').textContent = '⚠️ WAVE';
  $('sbTitle').textContent = w.name;
  $('sbAge').textContent = w.wall ? '一斉降下！' : `${w.minion}大量来襲`;
  b.classList.add('wave-banner');
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  b.style.borderColor = '#f44';
  $('scene').classList.add('boss-shake');
  setTimeout(() => $('scene').classList.remove('boss-shake'), 800);
  setTimeout(() => {
    b.classList.remove('show', 'wave-banner');
    b.style.borderColor = '';
  }, 1600);

  // ヒールwave: 確定ヒール+トースト
  if (w.heal && w.healDef) {
    setTimeout(() => {
      spawnHealFromDef(w.healDef);
      flashLuckyHint();
    }, 600);
    setTimeout(() => { state.waveActive = false; }, 1200);
    return;
  }
  // 壁wave: 横一列に同時降下、1箇所だけ抜け道
  if (w.wall) {
    setTimeout(() => spawnWallRow(w), 800);
    setTimeout(() => { state.waveActive = false; }, 1500);
    return;
  }
  // 通常wave: バナーフェード後にミニオンラッシュ開始
  const interval = (w.duration * 1000) / w.count;
  let count = 0;
  // 1.5秒のボス紹介後、一気に降下開始
  setTimeout(() => {
    if (!state.running) return;
    // 開始時に大きなトースト「○○、大量来襲！」
    flashWaveStart(w);
    state.waveSpawnTimer = setInterval(() => {
      if (count >= w.count || !state.running) {
        clearInterval(state.waveSpawnTimer);
        state.waveSpawnTimer = null;
        state.waveActive = false;
        return;
      }
      if (!state.modalOpen) {
        spawnItemFromDef({
          label: w.minion,
          sprite: w.minionSprite,
          stage: STAGES[state.stageIndex].id,
          tags: w.tags,
          mass: true,
        });
        count++;
      }
    }, interval);
  }, 1500);
}

function flashWaveStart(w) {
  const hint = document.createElement('div');
  hint.className = 'wave-rush';
  hint.textContent = `🚨 ${w.minion}、大量来襲！`;
  $('fallingArea').appendChild(hint);
  setTimeout(() => hint.remove(), 1400);
  Sound.warningTick();
}

function spawnWallRow(w) {
  const cols = w.wallCount || 6;
  const gapIdx = Math.floor(Math.random() * cols);
  const colWidth = state.fieldW / cols;
  const labels = ['通り魔','隕石','クマ','雷','大震災','戦争勃発','理不尽'];
  for (let k = 0; k < cols; k++) {
    if (k === gapIdx) continue; // 1箇所だけ抜け道
    const x = k * colWidth + (colWidth - ITEM_SIZE) / 2;
    spawnItemFromDef({
      label: pick(labels),
      sprite: w.sprite,
      stage: STAGES[state.stageIndex].id,
      tags: w.tags,
      mass: true,
    }, x);
  }
}

function flashLuckyHint() {
  const hint = document.createElement('div');
  hint.className = 'lucky-hint';
  hint.textContent = '✨ 一生に一度の幸運 ✨';
  $('fallingArea').appendChild(hint);
  setTimeout(() => hint.remove(), 2200);
  Sound.hapUp();
}

function flashBossAppear(w) {
  // 一瞬大きなボス画像を表示
  const div = document.createElement('div');
  div.className = 'boss-flash';
  const img = document.createElement('img');
  img.src = `img/${w.sprite}.png`;
  div.appendChild(img);
  $('fallingArea').appendChild(div);
  setTimeout(() => div.remove(), 1600);
}

function spawnItemFromDef(def, fixedX) {
  const x = fixedX !== undefined ? fixedX : Math.random() * (state.fieldW - ITEM_SIZE - 8) + 4;
  const el = document.createElement('div');
  const cls = ['fall-item','bad','with-sprite'];
  if (def.mass) cls.push('mass');
  el.className = cls.join(' ');
  if (def.sprite) {
    const img = document.createElement('img');
    img.src = `img/${def.sprite}.png`;
    img.alt = '';
    el.appendChild(img);
  }
  // ラベル(常時可視)
  const lbl = document.createElement('span');
  lbl.className = 'fi-label';
  lbl.textContent = def.label;
  el.appendChild(lbl);
  el.style.transform = `translate(${x}px, -${ITEM_SIZE + 10}px)`;
  $('fallingArea').appendChild(el);
  state.items.push({ def, x, y: -ITEM_SIZE - 10, el, consumed: false });
}

// === 衝突 ===
function collide(item) {
  if (item.consumed) return;
  item.consumed = true;
  const def = item.def;
  state.invulnFrames = INVULN_TICKS;
  if (item.isHeal) {
    log(`heal: ${def.label}`);
    Sound.hapUp();
    Sound.choice();
    state.lives = Math.min(INITIAL_LIVES, state.lives + (def.heal || 1));
    if (def.tags) state.deathTags.push(...def.tags);
    item.el.classList.add('caught');
    const p = $('protagonist');
    p.classList.remove('catch-good'); void p.offsetWidth; p.classList.add('catch-good');
    setTimeout(() => { item.el.remove(); state.items = state.items.filter(i => i !== item); }, 450);
    updateLives();
    state.spawnPaused = true;
    setTimeout(() => showHealManga(def), 500);
    return;
  }
  log(`hit: ${def.label}`);
  Sound.hapDown();
  Sound.tap();
  state.lives = Math.max(0, state.lives - 1);
  state.hits++;
  if (def.tags) state.deathTags.push(...def.tags);
  item.el.classList.add('exploded');
  const p = $('protagonist');
  p.classList.remove('hit');
  void p.offsetWidth;
  p.classList.add('hit');
  setTimeout(() => {
    item.el.remove();
    state.items = state.items.filter(i => i !== item);
  }, 450);
  updateLives();
  // 大量発生(mass)はポップアップのみ、通常の赤アイテムは5コマ漫画発動
  if (def.mass) {
    flashHitLabel(def);
  } else {
    state.spawnPaused = true;
    setTimeout(() => showHitManga(def), 500);
  }
}

function flashHitLabel(def) {
  const popup = document.createElement('div');
  popup.className = 'hit-popup';
  popup.innerHTML = `<img src="img/${def.sprite}.png" alt=""><span>💥 ${def.label}</span>`;
  $('fallingArea').appendChild(popup);
  setTimeout(() => popup.remove(), 1200);
}

function showHealManga(def) {
  if (!state.running || state.modalOpen) return;
  state.modalOpen = true;
  // 他アイテムは消去せず、画面上に残す(モーダル中はframe loopで一時停止)
  const overlay = $('storyOverlay');
  const skipEl = overlay.querySelector('.story-skip');
  $('storyPhase').textContent = '✨ 幸運か?';
  $('storyTitle').textContent = `+1ライフ ${def.label}`;
  $('storyGodLine').hidden = true;
  overlay.style.backgroundImage = '';
  const frames = def.scenes.map((s, idx) => ({
    text: s,
    img: idx === 0 ? def.sprite : (idx >= 3 ? 'sara_sad' : def.sprite),
  }));
  let i = 0;
  const renderFrame = idx => {
    const f = frames[idx];
    $('storyImg').src = `img/${f.img}.png`;
    $('storyImg').classList.remove('flash'); void $('storyImg').offsetWidth; $('storyImg').classList.add('flash');
    $('storyText').textContent = f.text;
    $('storyText').classList.remove('fade'); void $('storyText').offsetWidth; $('storyText').classList.add('fade');
    renderHitDots(frames.length, idx);
    skipEl.textContent = idx < frames.length - 1 ? `▶ タップで次へ (${idx+1}/${frames.length})` : `▶ タップで人生再開`;
    Sound.tap();
  };
  renderFrame(0);
  overlay.hidden = false;
  overlay.onclick = () => {
    i++;
    if (i < frames.length) renderFrame(i);
    else closeHitManga();
  };
}

function showHitManga(obstacle) {
  if (!state.running || state.modalOpen) return;
  const stage = STAGES[state.stageIndex];
  const tpl = HIT_TEMPLATES[stage.id];
  if (!tpl) { state.spawnPaused = false; return; }
  const frames = tpl.map((f, idx) => {
    const text = f.text.replace('{label}', obstacle.label);
    const img = (idx === 1 && obstacle.sprite) ? obstacle.sprite : f.img;
    return { text, img };
  });

  state.modalOpen = true;
  // 画面上の他アイテムを消去
  state.items.forEach(i => {
    if (i.el) {
      i.el.classList.add('vanish');
      setTimeout(() => { if (i.el && i.el.parentNode) i.el.remove(); }, 250);
    }
  });
  state.items = [];

  const overlay = $('storyOverlay');
  const skipEl = overlay.querySelector('.story-skip');
  $('storyPhase').textContent = `${stage.emoji} ${stage.name}編`;
  $('storyTitle').textContent = `💥 ${obstacle.label}`;
  $('storyGodLine').hidden = true;
  overlay.style.backgroundImage = '';

  let i = 0;
  const renderFrame = idx => {
    const f = frames[idx];
    $('storyImg').src = `img/${f.img}.png`;
    $('storyImg').classList.remove('flash');
    void $('storyImg').offsetWidth;
    $('storyImg').classList.add('flash');
    $('storyText').textContent = f.text;
    $('storyText').classList.remove('fade');
    void $('storyText').offsetWidth;
    $('storyText').classList.add('fade');
    renderHitDots(frames.length, idx);
    skipEl.textContent = idx < frames.length - 1 ? `▶ タップで次へ (${idx+1}/${frames.length})` : `▶ タップで人生再開`;
    Sound.tap();
  };
  renderFrame(0);
  overlay.hidden = false;
  overlay.onclick = () => {
    i++;
    if (i < frames.length) renderFrame(i);
    else closeHitManga();
  };
}

function renderHitDots(total, current) {
  const wrap = $('storyDots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let k = 0; k < total; k++) {
    const d = document.createElement('div');
    let cls = 'dot';
    if (k < current) cls += ' active';
    else if (k === current) cls += ' active current';
    d.className = cls;
    wrap.appendChild(d);
  }
}

function closeHitManga() {
  $('storyOverlay').hidden = true;
  $('storyOverlay').onclick = null;
  state.modalOpen = false;
  state.spawnPaused = false;
  state.lastFrame = performance.now();
  state.lastSpawn = performance.now();
}

// === ゲーム終了 ===
function endGame(earlyDeath) {
  log(`終了: lives=${state.lives}, hits=${state.hits}, tags=${state.deathTags.join(',')}`);
  state.running = false;
  clearInterval(state.tickHandle);
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.items.forEach(i => i.el && i.el.remove());
  state.items = [];
  Sound.stopBgm();
  Sound.endTimeUp();
  // タグ一致で死に様を選定
  const death = pickDeath(state.deathTags);
  state.pendingDeath = death;
  state.pendingEnding = {
    title: `💀 ${death.type}`,
    desc: death.msg,
    god: earlyDeath ? '神「早死にだったね、お疲れ」' : '神「お疲れ。よくある人生だよ」',
    img: 'funeral_coffin',
    godImg: 'god2_smug',
    rank: getRank(state.lives, state.hits),
  };
  state.endingKind = 'death';
  $('game').hidden = true;
  playEndingManga();
}

// === エンディング5コマ漫画 ===
function playEndingManga() {
  const death = state.pendingDeath;
  // 5コマ: 出生→学校→社畜→老後→死因
  const frames = [
    { text:'出生編。\n親ガチャ、外れた。', img:'parents_fight' },
    { text:'学校編。\nふつうに、しんどかった。', img:'classmate_cry' },
    { text:'社畜編。\n気づけば、20年経ってた。', img:'sara_sad' },
    { text:'老後編。\n気づけば、誰もいなかった。', img:'oldman_despair' },
    { text:`💀 ${death.type}\n${death.msg}`, img:'funeral_coffin' },
  ];
  const overlay = $('endingManga');
  const img = $('endingMangaImg');
  const text = $('endingMangaText');
  const dots = $('endingMangaDots');
  const skip = $('endingMangaSkip');
  let i = 0;
  const renderDots = (cur) => {
    dots.innerHTML = '';
    for (let k = 0; k < frames.length; k++) {
      const d = document.createElement('div');
      let cls = 'dot';
      if (k < cur) cls += ' active';
      else if (k === cur) cls += ' active current';
      d.className = cls;
      dots.appendChild(d);
    }
  };
  const renderFrame = idx => {
    const f = frames[idx];
    img.src = `img/${f.img}.png`;
    img.classList.remove('flash');
    void img.offsetWidth;
    img.classList.add('flash');
    text.textContent = f.text;
    text.classList.remove('fade');
    void text.offsetWidth;
    text.classList.add('fade');
    renderDots(idx);
    skip.textContent = idx < frames.length - 1 ? `▶ タップで次へ (${idx+1}/${frames.length})` : `▶ タップで結果へ`;
    Sound.tap();
    if (idx === frames.length - 1) Sound.endHell();
  };
  renderFrame(0);
  overlay.hidden = false;
  overlay.onclick = () => {
    i++;
    if (i < frames.length) renderFrame(i);
    else closeEndingManga();
  };
}

function closeEndingManga() {
  $('endingManga').hidden = true;
  $('endingManga').onclick = null;
  showResult();
}

function showResult() {
  const ending = state.pendingEnding;
  if (!ending) return;
  $('endingManga').hidden = true;
  $('result').hidden = false;
  $('resultTitle').textContent = ending.title;
  $('resultDeath').textContent = ending.desc;
  $('finalHap').textContent = state.lives;
  $('finalScore').textContent = state.hits * 100 + state.lives * 50;
  $('rank').textContent = `ランク: ${ending.rank}`;
  if (ending.img) {
    $('resultImg').hidden = false;
    $('resultImg').src = `img/${ending.img}.png`;
    document.querySelector('#result .skull').hidden = true;
  }
  $('godFinal').hidden = false;
  $('godFinal').querySelector('.gf-text').textContent = ending.god;
  if (ending.godImg) $('godFinal').querySelector('.gf-avatar-img').src = `img/${ending.godImg}.png`;
}

function share() {
  const death = state.pendingDeath;
  const text = `【3分で死んで笑う】\n死因: ${death.type}\n${death.msg}\n\n君も90秒の人生、笑って死ねる?`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      $('shareBtn').textContent = '✓ コピーしました';
      setTimeout(() => $('shareBtn').textContent = '📋 結果をコピー', 2000);
    });
  } else alert(text);
}

// === 神コメントバブル ===
function showGodComment(text) {
  if (!text) return;
  Sound.godSpeak();
  const bubble = $('godBubble');
  bubble.querySelector('.g-text').textContent = text;
  bubble.classList.remove('fadeOut');
  bubble.hidden = false;
  if (state.godHideTimer) clearTimeout(state.godHideTimer);
  state.godHideTimer = setTimeout(() => {
    bubble.classList.add('fadeOut');
    setTimeout(() => { bubble.hidden = true; bubble.classList.remove('fadeOut'); }, 300);
  }, 5000);
}

// === ユーティリティ ===
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

document.addEventListener('DOMContentLoaded', init);
