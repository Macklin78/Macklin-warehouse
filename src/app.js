/* 抽奖转盘 · 交互与绘制逻辑 */
(function(){
  'use strict';

  var TAU = Math.PI * 2;
  var LS_KEY = 'dafiyu-wheel-v1';
  var PALETTE = ['#34c759','#0fb9a6','#00a6e0','#2f6bf0','#7a5cf0','#f04438','#ff9500','#ffcc00'];
  var DEFAULT_NAMES = [['Lv0',10],['Lv1',9],['Lv2',8],['Lv3',7],['Lv4',6],['Lv5',5],['Lv6',4],['Lv6闪电',3]];

  /* ---------------- 状态 ---------------- */
  var state = { items: [], rotation: 0, muted: false, history: [] };
  var spinning = false;

  function uid(){ return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }

  function defaultItems(){
    return DEFAULT_NAMES.map(function(p, i){
      return { id: uid(), name: p[0], weight: p[1], color: PALETTE[i % PALETTE.length] };
    });
  }

  function weightOf(it){
    var w = Number(it && it.weight);
    return isFinite(w) && w > 0 ? w : 0;
  }

  function normalizeColor(c, i){
    if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    return PALETTE[(i || 0) % PALETTE.length];
  }

  /* ---------------- 存储 ---------------- */
  var saveTimer = 0;
  function scheduleSave(){
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 180);
  }
  function saveNow(){
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        v: 1,
        items: state.items.map(function(it){
          return { id: it.id, name: it.name, weight: it.weight, color: it.color };
        }),
        muted: state.muted,
        history: state.history.slice(0, 20)
      }));
    } catch (e) { /* 忽略存储异常 */ }
  }

  function load(){
    var ok = false;
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.items) && d.items.length) {
          state.items = d.items.map(function(it, i){
            var w = Number(it && it.weight);
            return {
              id: (it && typeof it.id === 'string' && it.id) ? it.id : uid(),
              name: (it && typeof it.name === 'string') ? it.name.slice(0, 12) : ('奖品' + (i + 1)),
              weight: (isFinite(w) && w > 0) ? w : 1,
              color: normalizeColor(it && it.color, i)
            };
          });
          ok = true;
        }
        if (d && typeof d.muted === 'boolean') state.muted = d.muted;
        if (d && Array.isArray(d.history)) state.history = d.history.slice(0, 20);
      }
    } catch (e) { /* 配置损坏则回退默认 */ }
    if (!ok) state.items = defaultItems();
    state.rotation = 0;
  }

  /* ---------------- 画布 ---------------- */
  var wrap = document.getElementById('wheelWrap');
  var canvas = document.getElementById('wheel');
  var ctx = canvas.getContext('2d');
  var CW = 0, CH = 0, CX = 0, CY = 0, RAD = 0, DPR = 1;

  function layout(){
    var rect = wrap.getBoundingClientRect();
    var size = Math.floor(Math.min(rect.width, rect.height) || rect.width || 320);
    if (size < 120) size = 120;
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    CW = CH = size;
    canvas.width = Math.round(size * DPR);
    canvas.height = Math.round(size * DPR);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = size / 2;
    CY = size / 2;
    RAD = size / 2 - Math.max(8, size * 0.022);
    draw();
  }

  function spanInfo(){
    var ws = state.items.map(weightOf);
    var total = ws.reduce(function(a, b){ return a + b; }, 0);
    var uniform = false;
    if (total <= 0) {
      uniform = true;
      total = state.items.length || 1;
      ws = state.items.map(function(){ return 1; });
    }
    var acc = 0;
    return ws.map(function(w){
      var span = (w / total) * TAU;
      var o = { start: acc, span: span, w: w, total: total, uniform: uniform };
      acc += span;
      return o;
    });
  }

  function textColorOn(hex){
    var h = normalizeColor(hex, 0).replace('#', '');
    var r = parseInt(h.substr(0, 2), 16) / 255;
    var g = parseInt(h.substr(2, 2), 16) / 255;
    var b = parseInt(h.substr(4, 2), 16) / 255;
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.66 ? '#3d3408' : '#ffffff';
  }

  function draw(){
    if (!ctx) return;
    ctx.clearRect(0, 0, CW, CH);

    // 白色底盘 + 阴影
    ctx.save();
    ctx.translate(CX, CY);
    ctx.beginPath();
    ctx.arc(0, 0, RAD + 6, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(20,22,26,.16)';
    ctx.shadowBlur = RAD * 0.11;
    ctx.shadowOffsetY = RAD * 0.035;
    ctx.fill();
    ctx.restore();

    var items = state.items;

    if (!items.length) {
      ctx.save();
      ctx.translate(CX, CY);
      ctx.beginPath();
      ctx.arc(0, 0, RAD, 0, TAU);
      var g = ctx.createLinearGradient(-RAD, -RAD, RAD, RAD);
      g.addColorStop(0, '#f4f5f7');
      g.addColorStop(1, '#e6e8ec');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = '#9aa0a8';
      ctx.font = '600 ' + Math.max(12, RAD * 0.085).toFixed(1) + 'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('还没有奖品', 0, 0);
      ctx.restore();
      drawHub();
      drawPointer();
      return;
    }

    var info = spanInfo();

    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(state.rotation);
    ctx.rotate(-Math.PI / 2);   // 让局部角度 0 指向正上方

    // 扇形
    for (var i = 0; i < items.length; i++) {
      var s = info[i];
      if (s.span <= 1e-6) continue;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, RAD, s.start, s.start + s.span);
      ctx.closePath();
      ctx.fillStyle = normalizeColor(items[i].color, i);
      ctx.fill();
    }

    // 扇形分隔线
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1.2, RAD * 0.013);
    for (var j = 0; j < items.length; j++) {
      var t = info[j];
      if (t.span <= 1e-6) continue;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(t.start) * RAD, Math.sin(t.start) * RAD);
      ctx.stroke();
    }

    // 文字：沿半径方向排字，字号随扇区宽窄自适应，太窄则省略以免重叠
    var baseFs = Math.max(10, Math.min(RAD * 0.125, 22));
    if (items.length > 12) baseFs = Math.max(9, baseFs * 0.9);
    var FONT = '-apple-system,"PingFang SC","Microsoft YaHei",system-ui,sans-serif';

    for (var k = 0; k < items.length; k++) {
      var u = info[k];
      if (u.span <= 1e-6) continue;
      var label = String(items[k].name == null ? '' : items[k].name);
      if (!label) continue;

      var mid = u.start + u.span / 2;
      var arcRoom = u.span * RAD * 0.5;           // 该扇区内可容纳的文字高度
      var fs = Math.min(baseFs, arcRoom * 0.82);
      if (fs < 8) continue;                       // 太窄就不画，避免糊成一团

      var thin = u.span < Math.PI / 12;            // 窄扇区：把字往外挪，角向空间更宽
      var anchor = RAD * (thin ? 0.66 : 0.60);
      var maxLen = RAD * (thin ? 0.62 : 0.72);

      var col = normalizeColor(items[k].color, k);
      var tc = textColorOn(col);

      ctx.save();
      ctx.rotate(mid);
      ctx.translate(anchor, 0);
      if (mid > Math.PI) ctx.rotate(Math.PI);      // 翻转到可读方向（旋转不超过 90°）

      ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      var natural = ctx.measureText(label).width;  // 太长就缩字号，避免横向挤压变形
      if (natural > maxLen && natural > 0) {
        fs = Math.max(7, fs * maxLen / natural);
        ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      }
      if (fs < 8) { ctx.restore(); continue; }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = tc;
      if (tc === '#ffffff') {
        ctx.shadowColor = 'rgba(0,0,0,.20)';
        ctx.shadowBlur = 2.5;
      }
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    drawHub();
    drawPointer();
  }

  function drawHub(){
    ctx.save();
    ctx.translate(CX, CY);
    var r = Math.max(15, RAD * 0.155);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, TAU);
    ctx.fillStyle = '#f0f1f4';
    ctx.fill();
    ctx.restore();
  }

  function drawPointer(){
    ctx.save();
    ctx.translate(CX, CY);
    var pw = Math.max(14, RAD * 0.092);
    var ph = Math.max(22, RAD * 0.19);
    ctx.beginPath();
    ctx.moveTo(-pw, -RAD - 2);
    ctx.lineTo(pw, -RAD - 2);
    ctx.lineTo(0, -RAD + ph);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.30)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(17,18,20,.10)';
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------- 音效 ---------------- */
  var actx = null;
  function beep(freq, dur, vol, type){
    if (state.muted) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      var t = actx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.04));
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + (dur || 0.04) + 0.02);
    } catch (e) { /* 静默失败 */ }
  }
  function tick(){ beep(950, 0.032, 0.030, 'square'); }
  function winSound(){
    if (state.muted) return;
    beep(660, 0.13, 0.07, 'sine');
    setTimeout(function(){ beep(880, 0.13, 0.07, 'sine'); }, 110);
    setTimeout(function(){ beep(1180, 0.22, 0.07, 'sine'); }, 220);
  }

  /* ---------------- 抽奖 ---------------- */
  function topSegment(info, rot){
    var a = (-rot) % TAU;
    if (a < 0) a += TAU;
    for (var i = 0; i < info.length; i++) {
      if (info[i].span <= 1e-6) continue;
      if (a >= info[i].start && a < info[i].start + info[i].span) return i;
    }
    return info.length - 1;
  }

  function pickIndex(info){
    var total = 0, i;
    for (i = 0; i < info.length; i++) total += info[i].w;
    if (total <= 0) return Math.floor(Math.random() * info.length);
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < info.length; i++) {
      acc += info[i].w;
      if (r < acc) return i;
    }
    return info.length - 1;
  }

  var spinBtn = document.getElementById('spinBtn');

  function syncButtons(){
    if (spinning) {
      spinBtn.disabled = true;
      spinBtn.textContent = '旋转中…';
    } else {
      spinBtn.disabled = false;
      spinBtn.textContent = '点击旋转';
    }
  }

  function spin(instant){
    if (spinning) return;
    var isInstant = instant === true;   // 只有显式传 true 才跳过动画（防事件对象误判）
    if (!state.items.length) {
      toast('请先添加奖品');
      openSheet();
      return;
    }
    var info = spanInfo();
    var totalW = 0, i;
    for (i = 0; i < info.length; i++) totalW += info[i].w;
    if (totalW <= 0) { toast('权重不能全为 0，请至少给一个奖品设置权重'); return; }

    var idx = pickIndex(info);
    var seg = info[idx];
    if (!seg || seg.span <= 1e-6) { idx = 0; seg = info[0]; }
    var pickedItem = state.items[idx];

    var mid = seg.start + seg.span / 2;
    var jitter = (Math.random() - 0.5) * seg.span * 0.55;
    var targetLocal = mid + jitter;

    var CUR = state.rotation;
    var delta = ((-targetLocal - CUR) % TAU + TAU) % TAU;
    var turns = 5 + Math.floor(Math.random() * 3);    // 多转 5~7 圈
    var end = CUR + delta + TAU * turns;
    var dur = 4600 + Math.random() * 1000;            // 约 4.6 ~ 5.6 秒
    var t0 = performance.now();
    var lastSeg = -1, lastTickAt = 0;

    spinning = true;
    syncButtons();

    if (isInstant) {               // 自动化校验用：直接落定结果，不播放动画
      state.rotation = end % TAU;
      draw();
      spinning = false;
      syncButtons();
      finish(pickedItem);
      return;
    }

    tick();

    var settled = false;
    var guard = 0;

    function settle(){
      if (settled) return;
      settled = true;
      if (guard) clearTimeout(guard);
      state.rotation = end % TAU;
      draw();
      spinning = false;
      syncButtons();
      // 以「指针实际停住的扇区」为准（用当前奖品列表重算，避免旋转途中改列表导致错位）
      var info2 = spanInfo();
      var topIdx = topSegment(info2, state.rotation);
      finish(state.items[topIdx] || pickedItem);
    }

    // 兜底：切到后台标签页时 requestAnimationFrame 会暂停，用定时器保证一定能出结果
    guard = setTimeout(settle, dur + 700);

    function frame(now){
      if (settled) return;                 // 已结算：立刻停住，避免残留帧把转盘继续转走
      var p = (now - t0) / dur;
      if (!(p > 0)) p = 0;                 // 防止首帧时间戳早于起点造成倒转
      if (p > 1) p = 1;
      var e = 1 - Math.pow(1 - p, 4.2);   // 起步快、收尾慢，最后几格慢慢挪
      state.rotation = CUR + (end - CUR) * e;
      draw();

      var top = topSegment(info, state.rotation);
      if (top !== lastSeg) {
        lastSeg = top;
        if (now - lastTickAt > 22) { lastTickAt = now; tick(); }
      }

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        settle();
      }
    }
    requestAnimationFrame(frame);
  }

  function finish(it){
    if (!it) return;
    var name = it.name || '(未命名)';
    state.history.unshift({ name: name, t: Date.now() });
    state.history = state.history.slice(0, 20);
    saveNow();

    var line = document.getElementById('resultLine');
    line.innerHTML = '上次中奖：<b></b>';
    line.querySelector('b').textContent = name;
    renderHistory();

    // 等转盘彻底停稳，再弹出中奖信息
    setTimeout(function(){
      document.getElementById('winName').textContent = name;
      document.getElementById('winSub').textContent = '本轮抽奖结果 · ' + fmtTime(Date.now());
      document.getElementById('winModal').classList.add('open');
      confetti();
      winSound();
    }, 340);
  }

  /* ---------------- 彩带 ---------------- */
  var cfCanvas = document.getElementById('confetti');
  var cfCtx = cfCanvas.getContext('2d');
  var cfParts = [], cfRAF = 0;

  function sizeConfetti(){
    cfCanvas.width = window.innerWidth;
    cfCanvas.height = window.innerHeight;
  }

  function confetti(){
    sizeConfetti();
    cfCanvas.classList.add('on');
    cfParts = [];
    var n = 110;
    for (var i = 0; i < n; i++) {
      cfParts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.5,
        y: window.innerHeight * 0.34 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 9,
        vy: -6 - Math.random() * 9,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 0.35,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        life: 1
      });
    }
    var t0 = performance.now();
    cancelAnimationFrame(cfRAF);

    function loop(now){
      var dt = Math.min(32, now - t0);
      t0 = now;
      var sec = dt / 1000;
      cfCtx.clearRect(0, 0, cfCanvas.width, cfCanvas.height);
      var alive = 0;
      for (var i = 0; i < cfParts.length; i++) {
        var p = cfParts[i];
        p.vy += 26 * sec;
        p.vx *= 0.995;
        p.x += p.vx * sec * 60 * 0.35;
        p.y += p.vy * sec * 2.4;
        p.rot += p.vr;
        p.life -= 0.0062;
        if (p.life <= 0 || p.y > cfCanvas.height + 40) continue;
        alive++;
        cfCtx.save();
        cfCtx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.8));
        cfCtx.translate(p.x, p.y);
        cfCtx.rotate(p.rot);
        cfCtx.fillStyle = p.color;
        cfCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        cfCtx.restore();
      }
      if (alive > 0) {
        cfRAF = requestAnimationFrame(loop);
      } else {
        cfCtx.clearRect(0, 0, cfCanvas.width, cfCanvas.height);
        cfCanvas.classList.remove('on');
      }
    }
    cfRAF = requestAnimationFrame(loop);
  }

  /* ---------------- 奖品列表 ---------------- */
  var listEl = document.getElementById('itemList');

  function escAttr(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtPct(v){
    if (!isFinite(v) || v < 0) v = 0;
    if (v >= 10) return v.toFixed(0) + '%';
    if (v >= 1) return v.toFixed(1) + '%';
    return v.toFixed(2) + '%';
  }

  function totalWeight(){
    return state.items.reduce(function(a, it){ return a + weightOf(it); }, 0);
  }

  function updatePcts(){
    var total = totalWeight();
    var cards = listEl.querySelectorAll('.item');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-id');
      var it = null;
      for (var k = 0; k < state.items.length; k++) {
        if (state.items[k].id === id) { it = state.items[k]; break; }
      }
      var pct = cards[i].querySelector('.pct');
      if (!pct) continue;
      pct.textContent = total > 0 ? fmtPct(weightOf(it) / total * 100) : '—';
    }
  }

  function renderList(){
    var total = totalWeight();
    listEl.innerHTML = '';
    state.items.forEach(function(it, i){
      var card = document.createElement('div');
      card.className = 'item';
      card.setAttribute('data-id', it.id);
      card.innerHTML =
        '<div class="item-row1">' +
          '<input class="color-pick" type="color" data-role="color" value="' + escAttr(normalizeColor(it.color, i)) + '" title="点击换颜色">' +
          '<input class="name-in" data-role="name" type="text" maxlength="12" value="' + escAttr(it.name) + '" placeholder="奖品名称">' +
          '<button class="del" data-role="del" type="button" title="删除">✕</button>' +
        '</div>' +
        '<div class="item-row2">' +
          '<span class="lbl">权重</span>' +
          '<input class="w-in" data-role="weight" type="number" min="0" step="0.5" value="' + (weightOf(it) || 0) + '">' +
          '<span class="pct" data-role="pct">' + (total > 0 ? fmtPct(weightOf(it) / total * 100) : '—') + '</span>' +
        '</div>';
      listEl.appendChild(card);
    });
    updatePcts();
  }

  function findItem(id){
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  listEl.addEventListener('input', function(e){
    var t = e.target;
    var role = t && t.getAttribute && t.getAttribute('data-role');
    if (!role || role === 'del') return;
    var card = t.closest ? t.closest('.item') : null;
    if (!card) return;
    var it = findItem(card.getAttribute('data-id'));
    if (!it) return;

    if (role === 'name') {
      it.name = t.value.slice(0, 12);
      draw();
      scheduleSave();
    } else if (role === 'weight') {
      var v = parseFloat(t.value);
      it.weight = (isFinite(v) && v > 0) ? v : 0;
      updatePcts();
      draw();
      scheduleSave();
    } else if (role === 'color') {
      it.color = normalizeColor(t.value, 0);
      draw();
      scheduleSave();
    }
  });

  listEl.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('[data-role="del"]') : null;
    if (!btn) return;
    var card = btn.closest('.item');
    var id = card && card.getAttribute('data-id');
    if (!id) return;
    state.items = state.items.filter(function(x){ return x.id !== id; });
    renderList();
    draw();
    scheduleSave();
  });

  /* ---------------- 面板 ---------------- */
  var sheet = document.getElementById('sheet');
  var winModal = document.getElementById('winModal');

  function openSheet(){
    if (spinning) { toast('转盘正在旋转，稍等一下～'); return; }
    renderList();
    renderHistory();
    sheet.classList.add('open');
  }
  function closeSheet(){ sheet.classList.remove('open'); }
  function closeWin(){ winModal.classList.remove('open'); }

  function renderHistory(){
    var box = document.getElementById('historyList');
    if (!state.history.length) {
      box.innerHTML = '<div class="empty">还没有抽奖记录</div>';
      return;
    }
    box.innerHTML = '';
    state.history.slice(0, 8).forEach(function(h){
      var row = document.createElement('div');
      row.className = 'row';
      var a = document.createElement('span');
      a.textContent = h && h.name ? h.name : '(未命名)';
      var b = document.createElement('span');
      b.textContent = fmtTime(h && h.t);
      row.appendChild(a);
      row.appendChild(b);
      box.appendChild(row);
    });
  }

  function fmtTime(ts){
    var d = new Date(ts || Date.now());
    function p(n){ return n < 10 ? '0' + n : '' + n; }
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- Toast ---------------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = 0;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('on'); }, 1900);
  }

  /* ---------------- 事件绑定 ---------------- */
  document.getElementById('fabEdit').addEventListener('click', openSheet);
  document.getElementById('topEditBtn').addEventListener('click', openSheet);
  document.getElementById('closeSheet').addEventListener('click', closeSheet);
  document.getElementById('doneBtn').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function(e){
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-close')) closeSheet();
  });
  winModal.addEventListener('click', function(e){
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-close')) closeWin();
  });

  spinBtn.addEventListener('click', function(){ spin(); });

  document.getElementById('addBtn').addEventListener('click', function(){
    var used = state.items.map(function(it){ return normalizeColor(it.color, 0); });
    var color = null;
    for (var i = 0; i < PALETTE.length; i++) {
      if (used.indexOf(PALETTE[i]) === -1) { color = PALETTE[i]; break; }
    }
    if (!color) color = PALETTE[state.items.length % PALETTE.length];

    var it = { id: uid(), name: '奖品' + (state.items.length + 1), weight: 1, color: color };
    state.items.push(it);
    renderList();
    draw();
    scheduleSave();

    var card = listEl.querySelector('[data-id="' + it.id + '"] .name-in');
    if (card) {
      card.focus();
      card.select();
      if (card.scrollIntoView) card.scrollIntoView({ block: 'nearest' });
    }
  });

  document.getElementById('resetBtn').addEventListener('click', function(){
    if (!window.confirm('恢复默认奖品？当前配置会被覆盖。')) return;
    state.items = defaultItems();
    state.rotation = 0;
    renderList();
    draw();
    saveNow();
    toast('已恢复默认');
  });

  document.getElementById('exportBtn').addEventListener('click', function(){
    try {
      var data = JSON.stringify({
        v: 1,
        items: state.items.map(function(it){ return { name: it.name, weight: it.weight, color: it.color }; })
      }, null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      function p(n){ return n < 10 ? '0' + n : '' + n; }
      a.href = url;
      a.download = '抽奖配置-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
      toast('已导出配置文件');
    } catch (e) {
      toast('导出失败');
    }
  });

  var fileInput = document.getElementById('fileInput');
  document.getElementById('importBtn').addEventListener('click', function(){ fileInput.click(); });

  fileInput.addEventListener('change', function(){
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      try {
        var d = JSON.parse(String(fr.result));
        var arr = Array.isArray(d) ? d : (d && d.items);
        if (!Array.isArray(arr) || !arr.length) throw new Error('bad');
        state.items = arr.map(function(it, i){
          var w = Number(it && it.weight);
          return {
            id: uid(),
            name: String((it && it.name) || ('奖品' + (i + 1))).slice(0, 12),
            weight: (isFinite(w) && w > 0) ? w : 1,
            color: normalizeColor(it && it.color, i)
          };
        });
        state.rotation = 0;
        renderList();
        draw();
        saveNow();
        toast('已导入 ' + state.items.length + ' 个奖品');
      } catch (err) {
        toast('文件格式不正确，导入失败');
      }
      fileInput.value = '';
    };
    fr.readAsText(f);
  });

  document.getElementById('clearHistory').addEventListener('click', function(){
    state.history = [];
    renderHistory();
    saveNow();
    toast('已清空记录');
  });

  document.getElementById('winClose').addEventListener('click', closeWin);
  document.getElementById('winAgain').addEventListener('click', function(){
    closeWin();
    setTimeout(spin, 140);
  });

  var soundBtn = document.getElementById('soundBtn');
  function syncSound(){
    var on = document.getElementById('icoSoundOn');
    var off = document.getElementById('icoSoundOff');
    if (on) on.style.display = state.muted ? 'none' : '';
    if (off) off.style.display = state.muted ? '' : 'none';
    soundBtn.title = state.muted ? '音效已关闭（点击开启）' : '音效已开启（点击关闭）';
  }
  soundBtn.addEventListener('click', function(){
    state.muted = !state.muted;
    syncSound();
    saveNow();
    if (!state.muted) beep(760, 0.06, 0.05, 'sine');
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      if (winModal.classList.contains('open')) { closeWin(); return; }
      if (sheet.classList.contains('open')) { closeSheet(); return; }
      return;
    }
    var tag = (e.target && e.target.tagName) || '';
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    if (typing) return;
    if (e.code === 'Space' || e.key === 'Enter') {
      if (sheet.classList.contains('open') || winModal.classList.contains('open')) return;
      e.preventDefault();
      spin();
    }
  });

  window.addEventListener('resize', function(){
    layout();
    if (cfCanvas.classList.contains('on')) sizeConfetti();
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function(){ layout(); }).observe(wrap);
  }

  /* ---------------- 启动 ---------------- */
  load();
  renderList();
  syncButtons();
  syncSound();
  layout();
  if (location.hash === '#edit') openSheet();

  // 首帧后再校准一次（字体/布局就绪）
  setTimeout(layout, 60);
  setTimeout(layout, 320);

  // 轻量调试钩子：方便自动化校验"指针指到的是否就是中奖项"
  window.__wheel = {
    state: state,
    topName: function(){
      var info = spanInfo();
      var i = topSegment(info, state.rotation);
      return state.items[i] ? state.items[i].name : null;
    },
    finishName: function(){
      return document.getElementById('winName').textContent;
    },
    lastResult: function(){
      return state.history[0] ? state.history[0].name : null;
    },
    spinInstant: function(){ spin(true); }
  };
})();
