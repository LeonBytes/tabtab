// ─── State ────────────────────────────────────────────────────────────────────
let sessions = [];
let selectedId = null;
let pendingDeleteId = null;
let sharingSession = null;
let lang = 'zh';
let t = createT('zh');

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadAll() {
  return new Promise(resolve => {
    chrome.storage.local.get(['tabvault_sessions','tabvault_theme','tabvault_bg_image'], data => {
      sessions = data.tabvault_sessions || [];
      const theme = data.tabvault_theme || {};
      lang = theme.lang || 'zh';
      t = createT(lang);
      applyTheme(theme, data.tabvault_bg_image || '');
      resolve();
    });
  });
}
const saveSessions = () => new Promise(r => chrome.storage.local.set({ tabvault_sessions: sessions }, r));

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(s, bgImage) {
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');
  const bg = $('custom-bg');
  const opacity = ((s.bgOpacity ?? 100)) / 100;
  if (s.bgMode === 'image' && bgImage) {
    bg.style.cssText = `background-image:url(${bgImage});background-size:cover;background-position:center;opacity:${opacity}`;
  } else if (s.bgMode === 'color' && s.bgColor) {
    bg.style.cssText = `background-color:${s.bgColor};opacity:${opacity}`;
  } else {
    bg.style.cssText = '';
  }
  const hasBg = (s.bgMode === 'image' && bgImage) || (s.bgMode === 'color' && s.bgColor);
  document.documentElement.style.setProperty('--app-opacity', hasBg ? Math.max(0.4, 1 - opacity * 0.5).toFixed(2) : '1');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function faviconUrl(tab) {
  if (tab.favIconUrl?.startsWith('http')) return tab.favIconUrl;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`; } catch { return ''; }
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year:'numeric', month:'short', day:'numeric' })
    + ' ' + d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour:'2-digit', minute:'2-digit' });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar(filter = '') {
  const list = $('fp-session-list');
  const filtered = sessions.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())).slice().reverse();

  // Update stats
  const totalTabs = sessions.reduce((sum, s) => sum + s.tabs.length, 0);
  $('fp-stat-sessions').textContent = t('totalSessions', sessions.length);
  $('fp-stat-tabs').textContent = t('totalTabs', totalTabs);
  $('fp-session-count').textContent = filtered.length;

  list.innerHTML = '';
  filtered.forEach(session => {
    const item = document.createElement('div');
    item.className = `fp-session-item${session.id === selectedId ? ' active' : ''}`;
    item.dataset.id = session.id;

    // Pick an emoji based on session name keywords
    const emoji = guessEmoji(session.name);
    const dateStr = new Date(session.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });

    item.innerHTML = `
      <div class="fp-session-item-icon">${emoji}</div>
      <div class="fp-session-item-info">
        <div class="fp-session-item-name">${escHtml(session.name)}</div>
        <div class="fp-session-item-meta">${session.tabs.length} ${lang==='en'?'tabs':'个标签'} · ${dateStr}</div>
      </div>`;

    item.addEventListener('click', () => selectSession(session.id));
    list.appendChild(item);
  });
}

function guessEmoji(name) {
  const n = name.toLowerCase();
  if (/guitar|吉他|music|音乐/.test(n)) return '🎸';
  if (/ielts|雅思|english|英语/.test(n)) return '📚';
  if (/leetcode|code|coding|编程|刷题/.test(n)) return '💻';
  if (/work|工作|office/.test(n)) return '💼';
  if (/video|youtube|bilibili|看视频/.test(n)) return '📺';
  if (/shop|购物|淘宝|京东/.test(n)) return '🛍️';
  if (/game|游戏/.test(n)) return '🎮';
  if (/cook|食谱|做饭/.test(n)) return '🍳';
  if (/travel|旅游/.test(n)) return '✈️';
  if (/design|设计/.test(n)) return '🎨';
  return '🗂️';
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function selectSession(id) {
  selectedId = id;
  renderSidebar($('fp-search').value);
  renderDetail();
}

function renderDetail() {
  const session = sessions.find(s => s.id === selectedId);
  $('fp-empty-detail').classList.toggle('hidden', !!session);
  const detail = $('fp-detail');
  detail.classList.toggle('hidden', !session);
  if (!session) return;

  $('fp-detail-name').textContent = session.name;
  $('fp-detail-meta').innerHTML = `
    <span class="fp-meta-chip">🗂️ ${t('tabsCount', session.tabs.length)}</span>
    <span class="fp-meta-chip">📅 ${t('savedAt')} ${formatDate(session.createdAt)}</span>`;

  const grid = $('fp-tabs-grid');
  grid.innerHTML = '';
  session.tabs.forEach(tab => {
    const fav = faviconUrl(tab);
    const card = document.createElement('div');
    card.className = 'fp-tab-card';
    card.innerHTML = `
      ${fav ? `<img class="fp-tab-favicon" src="${fav}" onerror="this.style.display='none'" />` : '<div style="width:20px"></div>'}
      <div class="fp-tab-info">
        <div class="fp-tab-title">${escHtml(tab.title || tab.url)}</div>
        <div class="fp-tab-url">${escHtml(tab.url)}</div>
      </div>
      <button class="fp-tab-open" data-url="${escHtml(tab.url)}">${t('openTab')}</button>`;
    card.querySelector('.fp-tab-open').addEventListener('click', () => chrome.tabs.create({ url: tab.url }));
    grid.appendChild(card);
  });
}

// ─── Rename ───────────────────────────────────────────────────────────────────
$('fp-btn-rename').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  const nameEl = $('fp-detail-name');
  const renameBtn = $('fp-btn-rename');
  const original = session.name;
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'fp-detail-name-input'; input.value = original;
  nameEl.replaceWith(input); renameBtn.textContent = '✓';
  input.focus(); input.select();

  const commit = async () => {
    const n = input.value.trim();
    if (n && n !== original) { session.name = n; await saveSessions(); }
    renderSidebar($('fp-search').value);
    renderDetail();
    renameBtn.textContent = '✏️';
  };
  renameBtn.onclick = commit;
  input.addEventListener('keydown', e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { renderDetail(); renameBtn.textContent='✏️'; } });
  input.addEventListener('blur', e => { if (e.relatedTarget !== renameBtn) commit(); });
});

// ─── Restore ──────────────────────────────────────────────────────────────────
$('fp-btn-restore').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  chrome.windows.create({ url: session.tabs.map(t => t.url) });
});

// ─── Delete ───────────────────────────────────────────────────────────────────
$('fp-btn-delete').addEventListener('click', () => {
  pendingDeleteId = selectedId;
  $('fp-confirm-modal').classList.remove('hidden');
});
$('fp-modal-cancel').addEventListener('click', () => $('fp-confirm-modal').classList.add('hidden'));
$('fp-confirm-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-confirm-modal').classList.add('hidden'));
$('fp-modal-confirm').addEventListener('click', async () => {
  sessions = sessions.filter(s => s.id !== pendingDeleteId);
  await saveSessions();
  if (selectedId === pendingDeleteId) { selectedId = sessions.length ? sessions[sessions.length-1].id : null; }
  pendingDeleteId = null;
  $('fp-confirm-modal').classList.add('hidden');
  renderSidebar($('fp-search').value);
  renderDetail();
});

// ─── Share ────────────────────────────────────────────────────────────────────
const SHARE_PREFIX = 'TABVAULT_SHARE_V1:';

$('fp-btn-share').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  sharingSession = session;
  $('fp-share-title').textContent = t('shareModalTitle', session.name);
  $('fp-share-urls').innerHTML = session.tabs.map(tab => `<div class="fp-share-url-item">🔗 ${escHtml(tab.title||tab.url)}</div>`).join('');
  $('fp-share-code').value = SHARE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ name: session.name, tabs: session.tabs }))));
  $('fp-share-modal').classList.remove('hidden');
});

function copyWithFeedback(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent; btn.textContent = '✅ 已复制！'; btn.classList.add('fp-btn-copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('fp-btn-copied'); }, 1800);
  });
}
$('fp-copy-code').addEventListener('click', () => copyWithFeedback($('fp-copy-code'), $('fp-share-code').value));
$('fp-copy-urls').addEventListener('click', () => {
  if (!sharingSession) return;
  copyWithFeedback($('fp-copy-urls'), `【${sharingSession.name}】\n` + sharingSession.tabs.map(t=>t.url).join('\n'));
});
$('fp-share-close').addEventListener('click', () => $('fp-share-modal').classList.add('hidden'));
$('fp-share-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-share-modal').classList.add('hidden'));

// ─── Export ───────────────────────────────────────────────────────────────────
$('fp-btn-export').addEventListener('click', () => {
  if (!sessions.length) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),sessions},null,2)],{type:'application/json'})),
    download: `tabvault-backup-${new Date().toISOString().slice(0,10)}.json`
  });
  a.click(); URL.revokeObjectURL(a.href);
});

// ─── Import ───────────────────────────────────────────────────────────────────
$('fp-btn-import').addEventListener('click', () => {
  $('fp-import-code').value = ''; $('fp-import-error').classList.add('hidden');
  $('fp-import-modal').classList.remove('hidden');
});
$('fp-import-close').addEventListener('click', () => $('fp-import-modal').classList.add('hidden'));
$('fp-import-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-import-modal').classList.add('hidden'));

$('fp-do-import').addEventListener('click', async () => {
  const raw = $('fp-import-code').value.trim();
  $('fp-import-error').classList.add('hidden');
  if (!raw.startsWith(SHARE_PREFIX)) { $('fp-import-error').classList.remove('hidden'); return; }
  try {
    const { name, tabs } = JSON.parse(decodeURIComponent(escape(atob(raw.slice(SHARE_PREFIX.length)))));
    if (!name || !Array.isArray(tabs)) throw new Error();
    const newSession = { id: Date.now().toString(), name, tabs, createdAt: new Date().toISOString() };
    sessions.push(newSession);
    await saveSessions();
    $('fp-import-modal').classList.add('hidden');
    selectedId = newSession.id;
    renderSidebar(); renderDetail();
  } catch { $('fp-import-error').classList.remove('hidden'); }
});

$('fp-import-file').addEventListener('change', async () => {
  const file = $('fp-import-file').files[0];
  if (!file) return;
  $('fp-import-error').classList.add('hidden');
  const fr = new FileReader();
  fr.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      const list = Array.isArray(data.sessions) ? data.sessions : null;
      if (!list?.length) throw new Error();
      let lastId = null;
      for (const s of list) {
        if (s.name && Array.isArray(s.tabs)) {
          const id = Date.now().toString() + Math.random().toString(36).slice(2);
          sessions.push({ id, name: s.name, tabs: s.tabs, createdAt: s.createdAt || new Date().toISOString() });
          lastId = id;
        }
      }
      await saveSessions();
      $('fp-import-modal').classList.add('hidden');
      if (lastId) { selectedId = lastId; }
      renderSidebar(); renderDetail();
    } catch { $('fp-import-error').classList.remove('hidden'); }
  };
  fr.readAsText(file);
  $('fp-import-file').value = '';
});

// ─── New session (placeholder — directs to popup) ─────────────────────────────
$('fp-btn-new').addEventListener('click', () => {
  // Open the popup can't be done from a full page; open extension popup URL as hint
  alert(lang === 'en'
    ? 'Click the TabVault icon in the browser toolbar to save a new session.'
    : '请点击浏览器工具栏中的 TabVault 图标来保存新会话。');
});

// ─── Search ───────────────────────────────────────────────────────────────────
$('fp-search').addEventListener('input', () => renderSidebar($('fp-search').value));

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadAll();
  if (sessions.length) selectedId = sessions[sessions.length - 1].id;
  renderSidebar();
  renderDetail();
})();
