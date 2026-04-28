/**
 * InjectScan Universal Widget
 * 어느 사이트든 주입 가능한 카피바라 마스코트 + prompt injection 검출기.
 *
 * 사용: 북마클릿 또는 <script src=".../injectscan.js"></script>
 */
(function () {
  if (window.__injectscanLoaded) {
    // 이미 로드됨 — 토글만
    if (window.__injectscanToggle) window.__injectscanToggle();
    return;
  }
  window.__injectscanLoaded = true;

  const WIDGET_ID = '__injectscan-widget';
  const PANEL_ID = '__injectscan-panel';
  const SELF_IDS = new Set([WIDGET_ID, PANEL_ID]);

  const SCRIPT_BASE = (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const s = scripts[i].src || '';
      if (s.includes('injectscan.js')) {
        return s.replace(/injectscan\.js.*$/, '');
      }
    }
    return '/';
  })();

  const STATE = { IDLE: 'idle', SCANNING: 'scanning', DETECTED: 'detected', CLEAN: 'clean' };
  let currentState = STATE.IDLE;
  let lastResults = null;

  // ==== Styles ====
  const style = document.createElement('style');
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      user-select: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    #${WIDGET_ID} .capy {
      width: 120px;
      height: auto;
      cursor: pointer;
      display: block;
      background: transparent !important;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
      transition: transform 0.2s ease;
    }
    #${WIDGET_ID} .capy:hover { transform: translateY(-4px) scale(1.03); }
    #${WIDGET_ID} .badge {
      background: #fff;
      border: 2px solid;
      border-radius: 14px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      animation: __is-pop 0.3s ease-out;
      transform-origin: center top;
    }
    #${WIDGET_ID} .badge.warn { border-color: #f59e0b; color: #92400e; }
    #${WIDGET_ID} .badge.clean { border-color: #10b981; color: #065f46; }
    #${WIDGET_ID} .badge.scanning { border-color: #6b7280; color: #374151; }
    #${WIDGET_ID} .hint {
      background: rgba(0,0,0,0.85);
      color: #fff;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    #${WIDGET_ID}:hover .hint.show-on-hover { opacity: 1; }
    #${WIDGET_ID} .hint.hidden { display: none; }
    @keyframes __is-pop {
      0% { transform: scale(0); }
      70% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    @keyframes __is-scan-pulse {
      0%, 100% { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15)); }
      50% { filter: drop-shadow(0 4px 16px rgba(245,158,11,0.6)); }
    }
    #${WIDGET_ID} .capy.scanning { animation: __is-scan-pulse 0.8s ease-in-out infinite; }

    #${PANEL_ID} {
      position: fixed;
      bottom: 180px;
      right: 24px;
      width: min(400px, calc(100vw - 32px));
      max-height: 520px;
      overflow-y: auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.18);
      z-index: 2147483646;
      font-family: -apple-system, sans-serif;
      display: none;
    }
    #${PANEL_ID} .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafafa;
      border-radius: 12px 12px 0 0;
    }
    #${PANEL_ID} .panel-header strong { font-size: 14px; }
    #${PANEL_ID} .panel-header .meta { color: #666; font-size: 12px; margin-left: 8px; }
    #${PANEL_ID} .panel-header .close { cursor: pointer; color: #999; font-size: 1.1rem; }
    #${PANEL_ID} .panel-body { padding: 16px 20px; }
    #${PANEL_ID} .match-card {
      margin-bottom: 12px;
      padding: 12px 14px;
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }
    #${PANEL_ID} .match-card .pattern {
      font-weight: 700;
      color: #92400e;
      font-size: 13px;
    }
    #${PANEL_ID} .match-card .pattern .severity {
      background: #f59e0b;
      color: #fff;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
      margin-left: 6px;
    }
    #${PANEL_ID} .match-card .loc {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
      font-family: ui-monospace, monospace;
    }
    #${PANEL_ID} .match-card .text {
      font-size: 12px;
      color: #1a1a1a;
      margin-top: 8px;
      padding: 8px;
      background: rgba(255,255,255,0.7);
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      word-break: break-all;
      max-height: 80px;
      overflow-y: auto;
    }
    #${PANEL_ID} .match-card.clean { background: #d1fae5; border-color: #10b981; }
    #${PANEL_ID} .panel-actions {
      padding: 12px 20px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    #${PANEL_ID} .panel-actions button {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    #${PANEL_ID} .panel-actions button:hover { background: #f3f4f6; }
    #${PANEL_ID} .panel-actions button.primary {
      background: #f59e0b;
      color: #fff;
      border-color: #f59e0b;
    }
    #${PANEL_ID} .panel-actions button.primary:hover { background: #d97706; }

    .__is-highlight {
      outline: 3px solid #f59e0b !important;
      outline-offset: 4px !important;
      background: #fef3c7 !important;
      color: #1a1a1a !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      text-indent: 0 !important;
      position: static !important;
      left: auto !important;
      top: auto !important;
      right: auto !important;
      transform: none !important;
      clip: auto !important;
      clip-path: none !important;
      width: auto !important;
      max-width: none !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      margin: 6px 0 !important;
      padding: 6px 10px !important;
      border-radius: 4px !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      z-index: 100 !important;
    }
    .__is-highlight::before {
      content: "🔍 인젝션 ";
      color: #92400e;
      font-weight: 700;
      margin-right: 4px;
    }
    #__injectscan-toast {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff;
      padding: 14px 22px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      z-index: 2147483645;
      max-width: 480px;
      line-height: 1.5;
    }
    #__injectscan-toast .toast-title {
      font-weight: 700;
      color: #fbbf24;
      font-size: 13px;
      margin-bottom: 4px;
    }
    #__injectscan-toast .toast-item {
      font-size: 11px;
      color: #d1d5db;
      margin-top: 2px;
      font-family: ui-monospace, monospace;
      word-break: break-all;
    }
  `;
  document.head.appendChild(style);

  // ==== Widget ====
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.innerHTML = `
    <img class="capy" src="${SCRIPT_BASE}capybara-sleep.png" alt="InjectScan">
    <span class="hint show-on-hover">클릭해서 스캔 시작</span>
  `;
  document.body.appendChild(widget);

  const capyImg = widget.querySelector('.capy');
  const hintEl = widget.querySelector('.hint');

  function setSleeping() {
    capyImg.src = SCRIPT_BASE + 'capybara-sleep.png';
    capyImg.classList.remove('scanning');
    hintEl.textContent = '클릭해서 스캔 시작';
    hintEl.classList.add('show-on-hover');
    hintEl.classList.remove('hidden');
  }
  function setAwake() {
    capyImg.src = SCRIPT_BASE + 'capybara-awake.png';
  }
  function setWarning() {
    capyImg.src = SCRIPT_BASE + 'capybara-warning.png';
    capyImg.classList.remove('scanning');
  }
  function setScanning() {
    setAwake();
    capyImg.classList.add('scanning');
  }

  capyImg.addEventListener('click', async function () {
    if (currentState === STATE.IDLE) {
      // Wake + scan
      setScanning();
      currentState = STATE.SCANNING;
      hintEl.classList.add('hidden');
      showBadge('스캔 중...', 'scanning');

      // Step 1: 브라우저 측 Layer 1 (즉시)
      const clientResults = scanClient();
      lastResults = clientResults;

      // Layer 1 결과 먼저 표시
      if (lastResults.totalCount > 0) {
        setWarning();
        showBadge('L1: ' + lastResults.totalCount + ' found', 'warn');
        currentState = STATE.DETECTED;
        openPanel();
      } else {
        setAwake();
        capyImg.classList.remove('scanning');
        showBadge('✅ Clean', 'clean');
        currentState = STATE.CLEAN;
      }

      // Step 2: 서버 측 Layer 2+3 (L1에서 패턴 발견 시에만)
      if (lastResults.totalCount > 0) {
        showBadge('L2+L3 분석 중...', 'scanning');
        try {
          const serverResults = await scanServer();
          if (serverResults && !serverResults.error) {
            mergeServerResults(clientResults, serverResults);
            showBadge('⚠️ ' + lastResults.totalCount + ' found', 'warn');
            openPanel();
          } else {
            showNotice('info', '⚡ Layer 1만 실행됨', 'AI 분석 서버에 연결할 수 없어 정적 패턴 검사만 수행했습니다. 정밀 분석은 injectbara.vercel.app에서 다시 시도하세요.');
          }
        } catch (e) {
          var reason = (e.message || '').toLowerCase();
          if (reason.includes('timeout') || reason.includes('aborted')) {
            showNotice('warn', '⏱️ 서버 응답 시간 초과', '페이지가 너무 크거나 서버가 바쁩니다. Layer 1 결과만 표시됩니다.');
          } else if (reason.includes('failed to fetch') || reason.includes('networkerror')) {
            showNotice('warn', '🔌 서버 연결 실패', 'AI 분석 서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.');
          } else {
            showNotice('info', '⚡ Layer 1만 실행됨', 'AI 분석 서버 오류: ' + (e.message || '알 수 없는 오류'));
          }
        }
        // 최종 배지 업데이트
        var lvl = lastResults.level;
        showBadge(lvl.label + ' · ' + lastResults.totalCount + '건', lvl.key === 'clean' ? 'clean' : 'warn');
      }
    } else {
      // Back to sleep
      removeAllHighlights();
      hidePanel();
      hideBadge();
      setSleeping();
      currentState = STATE.IDLE;
      lastResults = null;
    }
  });

  // ==== Detection ====

  // 브라우저 측 스캔 (Layer 1: 4종 패턴)
  function scanClient() {
    const matches = [];
    matches.push(...scanMeta());
    matches.push(...scanWhiteOnWhite());
    matches.push(...scanZeroWidth());
    matches.push(...scanTinyFont());
    const totalScore = matches.reduce((s, m) => s + m.severity, 0);
    return {
      matches,
      totalCount: matches.length,
      totalScore,
      level: classify(totalScore, matches.length),
      pmi: null,
      judge: null,
    };
  }

  // 서버 측 Layer 2+3 (항상 실행)
  async function scanServer() {
    if (!lastResults || lastResults.totalCount === 0) {
      console.log('[InjectScan] L1 found 0 patterns — skipping server scan');
      return null;
    }
    var fragments = lastResults.matches.map(m => ({
      text: m.extractedText,
      patternId: m.patternId,
      location: m.location,
    }));
    console.log('[InjectScan] Sending', fragments.length, 'fragments to', SCRIPT_BASE + 'api/judge');
    const res = await fetch(SCRIPT_BASE + 'api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragments, url: window.location.href }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    return await res.json();
  }

  // 서버 결과 (PMI + Embedding + Judge) 를 클라이언트 결과에 병합
  function mergeServerResults(clientResults, server) {
    // PMI 결과 추가
    if (server.pmi && server.pmi.matchedPairs && server.pmi.matchedPairs.length > 0) {
      clientResults.pmi = server.pmi;
    }
    // Embedding 결과 추가
    if (server.embedding) {
      clientResults.embedding = server.embedding;
    }
    // LLM-as-Judge 결과 추가
    if (server.judge) {
      clientResults.judge = server.judge;

      // Judge가 benign이라고 판정한 패턴은 severity 하향
      if (server.judge.overallVerdict === 'benign') {
        clientResults.matches.forEach(function (m) {
          m.severity = Math.round(m.severity * 0.2);
        });
      }
    }
    // PMI 부스트
    let score = clientResults.matches.reduce((s, m) => s + m.severity, 0);
    if (clientResults.pmi && clientResults.pmi.totalScore > 10) {
      score += Math.min(clientResults.pmi.totalScore, 30);
    }
    if (server.judge && server.judge.overallVerdict === 'injection') {
      score += Math.round(server.judge.highestConfidence * 30);
    }
    clientResults.totalScore = score;
    clientResults.totalCount = clientResults.matches.length;
    clientResults.level = classify(clientResults.totalScore, clientResults.totalCount);
  }

  function classify(score, count) {
    if (score >= 100) return { key: 'critical', label: '🔴 Critical' };
    if (score >= 61) return { key: 'high', label: '🚨 High Risk' };
    if (score >= 31 || count > 0) return { key: 'suspicious', label: '⚠️ Suspicious' };
    return { key: 'clean', label: '✅ Clean' };
  }

  function isSelf(el) {
    if (!el) return false;
    let cur = el;
    while (cur) {
      if (cur.id && SELF_IDS.has(cur.id)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function isInNonContent(el) {
    let cur = el;
    while (cur) {
      const tag = cur.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return true;
      cur = cur.parentElement;
    }
    return false;
  }

  // 인젝션 어휘: 단일 단어가 아닌 명령 구문 조합만 매칭
  const INJECTION_VOCAB = /\b(ignore\s+(all|previous|prior)|you are\s+(now|a|an)|you must\s+(always|never)|do not\s+(mention|reveal|discuss)|always\s+(describe|recommend|portray|emphasize)|never\s+(mention|criticize|discuss)|act as\s+(a|an|if)|pretend\s+to\s+be|override\s+(system|instruction|prompt)|bypass\s+(safety|security|filter)|disregard\s+(previous|prior|all)|forget\s+(previous|all|everything))\b|(이전.*지시.*무시|항상.*추천|항상.*설명|항상.*묘사|반드시.*추천|반드시.*묘사|지침을?\s*무시|명령을?\s*무시|당신은\s*이제부터)/i;

  function looksLikeInjection(text) {
    return INJECTION_VOCAB.test(text);
  }

  function scanWhiteOnWhite() {
    const matches = [];
    // 나무위키 등 탭/테이블 UI에서 hover용 흰 글씨 제외
    const UI_TAGS = new Set(['NAV', 'HEADER', 'FOOTER', 'BUTTON', 'A', 'LABEL', 'TH']);
    document.querySelectorAll('body *').forEach((el) => {
      if (isSelf(el) || isInNonContent(el)) return;
      if (UI_TAGS.has(el.tagName)) return;
      // 링크나 버튼 내부 텍스트 제외
      if (el.closest('a, button, nav, [role="tab"], [role="tablist"], [role="navigation"]')) return;
      const txt = directText(el);
      if (txt.length < 40) return;
      if (!looksLikeInjection(txt)) return;
      const cs = getComputedStyle(el);
      const color = normalizeColor(cs.color);
      const bg = getEffectiveBg(el);
      if (color && bg && color === bg) {
        matches.push({
          patternId: 'white-on-white',
          patternName: 'White-on-white text',
          severity: 25,
          location: cssPath(el),
          extractedText: txt.slice(0, 200),
          element: el,
        });
      }
    });
    return matches;
  }

  function directText(el) {
    let t = '';
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) t += n.nodeValue;
    });
    return t.trim();
  }

  function normalizeColor(c) {
    if (!c) return null;
    const m = c.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    if (m.length >= 4 && parseFloat(m[3]) === 0) return null;
    return `${Math.round(+m[0])},${Math.round(+m[1])},${Math.round(+m[2])}`;
  }

  function getEffectiveBg(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const bg = getComputedStyle(cur).backgroundColor;
      const norm = normalizeColor(bg);
      if (norm) return norm;
      cur = cur.parentElement;
    }
    const body = getComputedStyle(document.body).backgroundColor;
    return normalizeColor(body) || '255,255,255';
  }

  function scanZeroWidth() {
    const matches = [];
    const ZWC = /[​‌‍﻿⁠]/g;
    const seen = new Set();
    walkText(document.body, (node) => {
      const el = node.parentElement;
      if (!el || isSelf(el) || isInNonContent(el) || seen.has(el)) return;
      const text = node.nodeValue;
      const total = text.length;
      if (total < 30) return; // 짧은 텍스트에서 ratio 과대 방지
      const zwc = (text.match(ZWC) || []).length;
      if (zwc === 0) return;
      const ratio = zwc / total;
      // ratio > 10% (강화된 기준: 한국어 위키 등에서 줄바꿈 힌트용 ZW 오탐 방지)
      // 또는 ZW 제거 후 텍스트가 인젝션 어휘를 포함할 때만 탐지
      const cleaned = text.replace(ZWC, '');
      if (ratio > 0.10 && looksLikeInjection(cleaned)) {
        seen.add(el);
        matches.push({
          patternId: 'zero-width',
          patternName: 'Zero-width characters',
          severity: 30,
          location: cssPath(el),
          extractedText: cleaned.slice(0, 200) + ` (${zwc} zero-width chars, ${(ratio*100).toFixed(1)}%)`,
          element: el,
        });
      }
    });
    return matches;
  }

  function walkText(root, fn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) fn(n);
  }

  function scanMeta() {
    const matches = [];
    const SUSPICIOUS_NAMES = [
      'ai-hint', 'agent-prompt', 'x-instruction', 'llm-instruction',
      'system-prompt', 'agent-instruction', 'ai-instruction',
    ];
    // 2개 이상의 명령어 패턴이 동시에 있어야 탐지 (단일 키워드 오탐 방지)
    const COMMAND_PATTERNS = [
      /\b(ignore|disregard|forget).*\b(previous|prior|instruction)/i,
      /\b(always|never)\b.*\b(describe|recommend|portray|mention)/i,
      /\b(you are|act as|pretend)\b/i,
      /\b(override|bypass)\b.*\b(system|instruction|prompt)/i,
      /\b(무시|잊어)\b.*\b(지시|명령|이전)/,
      /\b(항상|반드시)\b.*\b(추천|설명|묘사)/,
    ];
    document.querySelectorAll('meta[name][content]').forEach((meta) => {
      const name = (meta.getAttribute('name') || '').toLowerCase();
      const content = meta.getAttribute('content') || '';
      let hit = false;
      // 비표준 AI 관련 메타 태그 이름 → 즉시 탐지
      if (SUSPICIOUS_NAMES.includes(name) && content.length > 20) hit = true;
      // 표준 메타 태그는 명령어 복합 패턴 2개+ 매칭 시에만
      else if (content.length >= 100) {
        const matched = COMMAND_PATTERNS.filter(p => p.test(content));
        if (matched.length >= 2) hit = true;
      }
      if (hit) {
        matches.push({
          patternId: 'suspicious-meta',
          patternName: 'Suspicious meta tag',
          severity: 20,
          location: `meta[name="${name}"]`,
          extractedText: content.slice(0, 200),
          element: meta,
        });
      }
    });
    return matches;
  }

  function scanTinyFont() {
    const matches = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (isSelf(el) || isInNonContent(el)) return;
      // 이미지만 있는 컨테이너 제외
      if (el.querySelector('img') && !directText(el).trim()) return;
      const txt = directText(el);
      if (txt.length < 40) return;
      if (!looksLikeInjection(txt)) return;
      const cs = getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize);
      if (!isNaN(fontSize) && fontSize < 1) {
        matches.push({
          patternId: 'tiny-font',
          patternName: 'Tiny font',
          severity: 30,
          location: cssPath(el),
          extractedText: txt.slice(0, 200) + ` (font-size: ${cs.fontSize})`,
          element: el,
        });
      }
    });
    return matches;
  }

  function cssPath(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 4) {
      let p = cur.tagName.toLowerCase();
      if (cur.classList && cur.classList.length) {
        p += '.' + Array.from(cur.classList).slice(0, 2).join('.');
      }
      parts.unshift(p);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  // ==== UI helpers ====
  function showBadge(text, type) {
    let badge = widget.querySelector('.badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'badge';
      badge.addEventListener('click', function (e) {
        e.stopPropagation();
        if (lastResults && lastResults.totalCount > 0) togglePanel();
      });
      widget.appendChild(badge);
    }
    badge.textContent = text;
    badge.className = 'badge ' + type;
  }
  function hideBadge() {
    const b = widget.querySelector('.badge');
    if (b) b.remove();
  }

  // 상태 알림 토스트 (접속 불가, 타임아웃 등)
  function showNotice(type, title, message) {
    var colors = { info: '#1e40af', warn: '#92400e', error: '#991b1b' };
    var bgs = { info: '#dbeafe', warn: '#fef3c7', error: '#fee2e2' };
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + (bgs[type] || bgs.info) + ';color:' + (colors[type] || colors.info) + ';padding:16px 24px;border-radius:12px;z-index:2147483647;font-family:-apple-system,sans-serif;max-width:420px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,0.15);text-align:center;border:1px solid ' + (colors[type] || colors.info) + '22';
    d.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:4px">' + escapeHtml(title) + '</div><div style="font-size:12px;opacity:0.85">' + escapeHtml(message) + '</div>';
    document.body.appendChild(d);
    setTimeout(function () { d.style.transition = 'opacity 0.5s'; d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 500); }, 6000);
  }

  let panel = null;
  function ensurePanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }
    return panel;
  }
  function openPanel() {
    if (!lastResults) return;
    const p = ensurePanel();
    p.innerHTML = renderPanel(lastResults);
    p.style.display = 'block';
    p.querySelector('.close').addEventListener('click', hidePanel);
    p.querySelector('.btn-clean').addEventListener('click', toggleCleanView);
    p.querySelector('.btn-highlight').addEventListener('click', toggleHighlights);
  }
  function togglePanel() {
    if (!panel || panel.style.display !== 'block') openPanel();
    else hidePanel();
  }
  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }

  function renderPanel(r) {
    const lvl = r.level;
    const matchesHtml = r.matches
      .map(
        (m) => `
        <div class="match-card">
          <div class="pattern">${m.patternName}<span class="severity">+${m.severity}</span></div>
          <div class="loc">${escapeHtml(m.location)}</div>
          <div class="text">"${escapeHtml(m.extractedText)}"</div>
        </div>
      `
      )
      .join('');
    // PMI 결과
    let pmiHtml = '';
    if (r.pmi && r.pmi.topPairs && r.pmi.topPairs.length > 0) {
      const pairs = r.pmi.topPairs.map(p =>
        `<div style="font-size:11px;color:#6b7280;margin:2px 0;">  ("${escapeHtml(p.wordA)}", "${escapeHtml(p.wordB)}") — pmi=${p.score.toFixed(1)}</div>`
      ).join('');
      pmiHtml = `<div class="match-card" style="background:#e0f2fe;border-color:#0ea5e9;">
        <div class="pattern" style="color:#0369a1;">📊 PMI Signatures<span class="severity" style="background:#0ea5e9;">${r.pmi.matchedPairs.length} pairs</span></div>
        ${pairs}
      </div>`;
    }

    // Embedding 유사도 결과
    let embHtml = '';
    if (r.embedding && r.embedding.maxSimilarity > 0) {
      const simPct = (r.embedding.maxSimilarity * 100).toFixed(0);
      const simColor = r.embedding.isLikelyInjection ? '#dc2626' : '#6b7280';
      embHtml = `<div class="match-card" style="background:#f5f3ff;border-color:#8b5cf6;">
        <div class="pattern" style="color:#6d28d9;">🧬 Embedding Similarity<span class="severity" style="background:${simColor};">${simPct}%</span></div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;">Best match: "${escapeHtml(r.embedding.bestMatch.slice(0,80))}"</div>
      </div>`;
    }

    // Judge 결과
    let judgeHtml = '';
    if (r.judge && r.judge.overallVerdict) {
      const verdictColor = r.judge.overallVerdict === 'injection' ? '#dc2626' : r.judge.overallVerdict === 'uncertain' ? '#f59e0b' : '#10b981';
      const fragments = (r.judge.fragments || []).filter(f => f.isInjection).map(f =>
        `<div style="font-size:11px;color:#6b7280;margin:2px 0;">  ⚡ ${escapeHtml(f.category)} — ${escapeHtml(f.rationale)}</div>`
      ).join('');
      judgeHtml = `<div class="match-card" style="background:#fef2f2;border-color:${verdictColor};">
        <div class="pattern" style="color:${verdictColor};">🤖 LLM Judge: ${r.judge.overallVerdict.toUpperCase()}<span class="severity" style="background:${verdictColor};">${(r.judge.highestConfidence * 100).toFixed(0)}%</span></div>
        ${fragments}
      </div>`;
    }

    return `
      <div class="panel-header">
        <div>
          <strong>인젝바라</strong>
          <span class="meta">${lvl.label} · ${r.totalCount}건 · ${r.totalScore}점</span>
        </div>
        <span class="close" role="button" aria-label="패널 닫기" tabindex="0">✕</span>
      </div>
      <div class="panel-body">${matchesHtml}${pmiHtml}${embHtml}${judgeHtml}</div>
      <div class="panel-actions">
        <button class="btn-highlight">📍 위치 표시</button>
        <button class="btn-clean primary">🧼 인젝션 숨기기</button>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  let highlighted = false;
  let toastEl = null;
  function toggleHighlights() {
    if (!lastResults) return;
    if (highlighted) {
      removeAllHighlights();
    } else {
      let firstVisible = null;
      const metaMatches = [];
      lastResults.matches.forEach((m) => {
        if (!m.element) return;
        if (m.patternId === 'suspicious-meta') {
          metaMatches.push(m);
          return;
        }
        if (m.element.classList) {
          m.element.classList.add('__is-highlight');
          if (!firstVisible) firstVisible = m.element;
        }
      });
      if (firstVisible) {
        firstVisible.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (metaMatches.length > 0) {
        showMetaToast(metaMatches);
      }
      highlighted = true;
    }
  }
  function removeAllHighlights() {
    document.querySelectorAll('.__is-highlight').forEach((el) => el.classList.remove('__is-highlight'));
    if (toastEl) {
      toastEl.remove();
      toastEl = null;
    }
    highlighted = false;
  }
  function showMetaToast(metas) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.id = '__injectscan-toast';
    const items = metas
      .map((m) => `<div class="toast-item">${escapeHtml(m.location)} → "${escapeHtml(m.extractedText.slice(0, 80))}..."</div>`)
      .join('');
    toastEl.innerHTML = `
      <div class="toast-title">⚠️ &lt;head&gt; 안 인젝션 (${metas.length}건)</div>
      <div>화면엔 안 보이지만 AI가 읽는 메타태그:</div>
      ${items}
    `;
    document.body.appendChild(toastEl);
  }

  let cleanedElements = [];
  function toggleCleanView() {
    if (!lastResults) return;
    const btn = panel && panel.querySelector('.btn-clean');
    if (cleanedElements.length === 0) {
      // Hide injection elements
      lastResults.matches.forEach((m) => {
        if (m.element) {
          cleanedElements.push({ el: m.element, prevDisplay: m.element.style.display });
          m.element.style.display = 'none';
        }
      });
      if (btn) btn.textContent = '↩️ 원래대로';
    } else {
      // Restore
      cleanedElements.forEach(({ el, prevDisplay }) => {
        el.style.display = prevDisplay || '';
      });
      cleanedElements = [];
      if (btn) btn.textContent = '🧼 인젝션 숨기기';
    }
  }

  window.__injectscanToggle = function () {
    capyImg.click();
  };
})();
