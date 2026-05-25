(function () {
  // ---------- スライドメタデータ（サイドバー表示用の名称） ----------
  const SLIDE_LABELS = [
    '表紙',
    '自己紹介',
    'コンセプトムービー',
    '会社概要 扉',
    '会社概要',
    '事業内容 扉',
    '事業内容 詳細',
    '事業概要ムービー',
    'Enjinで得られる3つのチカラ',
    '考え方/文化 扉',
    '考え方/文化',
    '福利厚生',
    '会社の雰囲気',
    '求める人物像 扉',
    '求める人物像',
    'さいごに 扉',
    'クイズ Q',
    'クイズ 答え',
    'ご縁探し',
    '未来のご縁',
    '選考情報',
    '結び',
  ];

  // ---------- 各スライドの中身を .slide-inner でラップ ----------
  document.querySelectorAll('.slide').forEach((slide) => {
    if (slide.querySelector(':scope > .slide-inner')) return;
    const inner = document.createElement('div');
    inner.className = 'slide-inner';
    while (slide.firstChild) inner.appendChild(slide.firstChild);
    slide.appendChild(inner);
  });

  const slides = Array.from(document.querySelectorAll('.slide'));
  slides.forEach((s, i) => s.dataset.idx = i);

  // 各スライドの「本番含める」状態（true = 表示）
  const STORAGE_KEY = 'enjin-deck-visible-v1';
  let visibleMap = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length === slides.length) return saved;
    } catch (e) {}
    return slides.map(() => true);
  })();
  function saveVisibleMap() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleMap)); } catch (e) {}
  }

  // ---------- 16:9 キャンバスを画面にフィット ----------
  const BASE_W = 1600, BASE_H = 900;
  function fitSlides() {
    // メイン領域のサイズに合わせる（サイドバー幅を考慮）
    const stageW = document.documentElement.clientWidth - (isPresent() ? 0 : SIDEBAR_W());
    const stageH = window.innerHeight;
    const sx = stageW / BASE_W;
    const sy = stageH / BASE_H;
    const scale = Math.min(sx, sy);
    document.documentElement.style.setProperty('--slide-scale', scale);
    document.documentElement.style.setProperty('--stage-w', stageW + 'px');
  }
  function SIDEBAR_W() {
    return document.body.classList.contains('sidebar-collapsed') ? 56 : 280;
  }
  window.addEventListener('resize', fitSlides);

  // ---------- サイドバーのサムネイル生成 ----------
  const thumbList = document.getElementById('thumbList');
  function renderThumbs() {
    thumbList.innerHTML = '';
    slides.forEach((slide, i) => {
      const li = document.createElement('li');
      li.className = 'thumb' + (visibleMap[i] ? '' : ' thumb--hidden');
      li.dataset.idx = i;

      // ミニチュア（スライドのクローン）— `.slide` クラスは付けない（querySelectorAll汚染回避）
      const mini = document.createElement('div');
      mini.className = 'thumb-mini';
      const innerClone = slide.querySelector('.slide-inner').cloneNode(true);
      innerClone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // 元スライドの修飾クラス（slide--cover など）を thumb-slide にコピー
      const variantClasses = Array.from(slide.classList).filter(c => c.startsWith('slide--'));
      const slideClsClone = document.createElement('div');
      slideClsClone.className = 'thumb-slide ' + variantClasses.join(' ');
      slideClsClone.appendChild(innerClone);
      mini.appendChild(slideClsClone);

      const meta = document.createElement('div');
      meta.className = 'thumb-meta';
      meta.innerHTML = `
        <span class="thumb-num mono">${String(i + 1).padStart(2, '0')}</span>
        <span class="thumb-name">${SLIDE_LABELS[i] || ''}</span>
        <button class="thumb-eye" title="本番に含めるか切替">${visibleMap[i] ? '👁' : '⊘'}</button>
      `;

      li.appendChild(mini);
      li.appendChild(meta);
      thumbList.appendChild(li);
    });
    updateVisibleCount();
  }

  function updateVisibleCount() {
    const visible = visibleMap.filter(v => v).length;
    const total = visibleMap.length;
    document.getElementById('visibleCount').textContent = `${visible} / ${total} 表示`;
    document.getElementById('slideTotal').textContent = visible;
    // 非表示スライドにクラス付与（プレゼン中はスキップ対象）
    slides.forEach((s, i) => {
      s.classList.toggle('slide--excluded', !visibleMap[i]);
    });
  }

  // クリック処理（サイドバー）
  thumbList.addEventListener('click', (e) => {
    const eye = e.target.closest('.thumb-eye');
    const thumb = e.target.closest('.thumb');
    if (!thumb) return;
    const idx = parseInt(thumb.dataset.idx, 10);
    if (eye) {
      e.stopPropagation();
      visibleMap[idx] = !visibleMap[idx];
      eye.textContent = visibleMap[idx] ? '👁' : '⊘';
      thumb.classList.toggle('thumb--hidden', !visibleMap[idx]);
      updateVisibleCount();
      saveVisibleMap();
      return;
    }
    goTo(idx, { smooth: true });
  });

  // ---------- 現在スライド検出 ----------
  let currentIndex = 0;
  function syncInView() {
    const vh = window.innerHeight;
    const center = window.scrollY + vh / 2;
    const idx = Math.max(0, Math.min(slides.length - 1, Math.floor(center / vh)));
    currentIndex = idx;
    slides.forEach((s, i) => s.classList.toggle('in-view', i === idx));
    document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('thumb--current', i === idx));
    document.getElementById('slideNow').textContent = idx + 1;
    updateProgress();
    updateHash();
    // 現在のサムネイルが見えるようにスクロール
    const currentThumb = thumbList.querySelector('.thumb--current');
    if (currentThumb && !isPresent()) {
      const rect = currentThumb.getBoundingClientRect();
      const sbRect = document.getElementById('sidebar').getBoundingClientRect();
      if (rect.top < sbRect.top + 80 || rect.bottom > sbRect.bottom - 20) {
        currentThumb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  window.addEventListener('scroll', syncInView, { passive: true });
  window.addEventListener('resize', syncInView);

  function updateProgress() {
    const visibleBefore = visibleMap.slice(0, currentIndex + 1).filter(v => v).length;
    const total = visibleMap.filter(v => v).length || 1;
    const pct = (visibleBefore / total) * 100;
    document.getElementById('progressFill').style.width = pct + '%';
  }

  // ---------- ナビゲーション ----------
  function goTo(idx, opts = {}) {
    if (idx < 0 || idx >= slides.length) return;
    slides[idx].scrollIntoView({ behavior: opts.smooth ? 'smooth' : 'auto', block: 'start' });
  }
  function nextVisible() {
    for (let i = currentIndex + 1; i < slides.length; i++) {
      if (visibleMap[i]) { goTo(i, { smooth: true }); return; }
    }
  }
  function prevVisible() {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (visibleMap[i]) { goTo(i, { smooth: true }); return; }
    }
  }
  function next() {
    if (isPresent()) nextVisible();
    else goTo(currentIndex + 1, { smooth: true });
  }
  function prev() {
    if (isPresent()) prevVisible();
    else goTo(currentIndex - 1, { smooth: true });
  }

  // ---------- 動画再生（video / iframe / プレースホルダーの3モード） ----------
  document.querySelectorAll('.video-frame').forEach((frame) => {
    const video = frame.querySelector('.video-el');
    const iframe = frame.querySelector('.video-iframe');
    const vp = frame.querySelector('.video-placeholder');
    if (!vp) return;

    let videoReady = false;
    if (video) {
      video.addEventListener('loadedmetadata', () => { videoReady = true; });
      video.addEventListener('error', () => { video.remove(); });
    }

    vp.addEventListener('click', (e) => {
      // 外部リンクは普通に開かせる
      if (e.target.closest('.video-external')) return;
      e.stopPropagation();

      if (iframe) {
        // iframeモード：data-srcから読み込み
        if (!iframe.src || iframe.src === 'about:blank') {
          iframe.src = iframe.dataset.src;
        }
        vp.classList.add('hidden');
        return;
      }
      if (videoReady && video) {
        vp.classList.add('hidden');
        video.controls = true;
        video.play().catch(() => {});
        video.addEventListener('ended', () => next(), { once: true });
        return;
      }
      // プレースホルダーモード
      if (!vp.classList.contains('playing')) {
        vp.classList.add('playing');
        const caption = vp.querySelector('.video-caption');
        const sub = vp.querySelector('.video-sub');
        const btn = vp.querySelector('.play-btn');
        if (caption) caption.textContent = '再生中…';
        if (sub) sub.textContent = `assets/${video?.querySelector('source')?.src.split('/').pop() || '動画'} を配置すると再生`;
        if (btn) btn.textContent = '♪';
      } else {
        next();
      }
    });
  });

  // ---------- クリック / キーボード ----------
  document.addEventListener('click', (e) => {
    if (e.target.closest('.video-placeholder')) return;
    if (e.target.closest('#sidebar')) return;
    if (e.target.closest('#toolbar')) return;
    if (!isPresent()) return; // 編集モード時はクリックで進めない
    next();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (['ArrowDown', 'Space', ' ', 'PageDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); next();
    } else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault(); prev();
    } else if (e.key === 'Home') {
      goTo(0, { smooth: true });
    } else if (e.key === 'End') {
      goTo(slides.length - 1, { smooth: true });
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'Escape') {
      if (isPresent()) exitPresent();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePresent();
    }
  });

  // ---------- プレゼンモード ----------
  function isPresent() {
    return document.body.classList.contains('present-mode');
  }
  function enterPresent() {
    document.body.classList.add('present-mode');
    // 最初の表示スライドへ
    const firstVisible = visibleMap.findIndex(v => v);
    if (firstVisible >= 0 && firstVisible !== currentIndex) goTo(firstVisible, { smooth: false });
    fitSlides();
  }
  function exitPresent() {
    document.body.classList.remove('present-mode');
    if (document.fullscreenElement) document.exitFullscreen();
    fitSlides();
  }
  function togglePresent() {
    if (isPresent()) exitPresent(); else enterPresent();
  }
  document.getElementById('enterPresent').addEventListener('click', enterPresent);
  document.getElementById('exitPresent').addEventListener('click', exitPresent);

  // ---------- フルスクリーン ----------
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

  // ---------- 印刷 ----------
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  // ---------- サイドバー折りたたみ ----------
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    fitSlides();
  });

  // ---------- URLハッシュ対応 ----------
  function updateHash() {
    const newHash = `#slide-${currentIndex + 1}`;
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  }
  function handleHash() {
    const m = location.hash.match(/^#slide-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < slides.length) goTo(idx, { smooth: false });
    }
  }
  window.addEventListener('hashchange', handleHash);

  // ---------- ナビヒント自動非表示 ----------
  setTimeout(() => document.getElementById('navHint').classList.add('hide'), 5000);

  // ---------- 初期化 ----------
  renderThumbs();
  fitSlides();
  // 初回 sync を複数回叩いてスクロール復元に追従
  syncInView();
  setTimeout(syncInView, 50);
  setTimeout(syncInView, 200);
  if (location.hash) handleHash();
})();
