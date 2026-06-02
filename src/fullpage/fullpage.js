// ─── State ────────────────────────────────────────────────────────────────────
let sessions = [];
let selectedId = null;
let pendingDeleteId = null;
let sharingSession = null;
let currentTabs = [];       // tabs for inline save view
let selectedTabIds = new Set();
let addCandidateTabs = [];  // tabs for add-to-session modal
let addSelectedIds = new Set();
let themeSettings = { theme: 'dark', bgMode: 'color', bgColor: '', bgImage: '', bgOpacity: 100, lang: 'zh' };
let t = createT('zh');
let currentLayout = localStorage.getItem('tabvault_layout') || 'grid'; // 'grid' | 'compact' | 'list'

const $ = id => document.getElementById(id);

// ─── Storage ──────────────────────────────────────────────────────────────────
async function loadAll() {
  return new Promise(resolve => {
    chrome.storage.local.get(['tabvault_sessions','tabvault_theme','tabvault_bg_image'], data => {
      sessions = data.tabvault_sessions || [];
      if (data.tabvault_theme) themeSettings = { ...themeSettings, ...data.tabvault_theme };
      if (data.tabvault_bg_image) themeSettings.bgImage = data.tabvault_bg_image;
      t = createT(themeSettings.lang);
      resolve();
    });
  });
}
const saveSessions = () => new Promise(r => chrome.storage.local.set({ tabvault_sessions: sessions }, r));
function saveTheme() {
  chrome.storage.local.set({ tabvault_theme: { ...themeSettings, bgImage: '' } });
  if (themeSettings.bgImage) chrome.storage.local.set({ tabvault_bg_image: themeSettings.bgImage });
  else chrome.storage.local.remove('tabvault_bg_image');
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
function applyTranslations() {
  t = createT(themeSettings.lang);
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  const attr = (id, a, v) => { const el = $(id); if (el) el.setAttribute(a, v); };

  // header buttons with full text
  const importBtn = $('fp-btn-import');
  if (importBtn) importBtn.textContent = '⬆ ' + t('importBtn');
  const exportBtn = $('fp-btn-export');
  if (exportBtn) exportBtn.textContent = t('exportBtn');
  // settings icon stays ⚙️, just update tooltip
  const settingsBtn = $('fp-btn-settings');
  if (settingsBtn) settingsBtn.title = t('settingsTooltip');
  $('fp-btn-new').innerHTML = t('saveBtnFull');
  const collapseLabel = $('fp-collapse-label');
  if (collapseLabel) collapseLabel.textContent = t('collapseTitle');

  // sidebar
  set('fp-sidebar-title', t('allSessions'));
  set('fp-empty-hint', t('selectSessionHint'));

  // detail buttons (re-set each render, but also set defaults)
  set('fp-btn-restore', t('restoreAll'));
  set('fp-btn-add-tabs', t('addTabs'));
  set('fp-btn-share', t('shareSession'));
  set('fp-btn-delete', t('deleteSession'));

  // inline save view
  set('fp-save-view-title', t('saveBtnFull'));
  $('fp-save-view-cancel').textContent = t('cancel');
  set('fp-sv-name-label', t('sessionNameLabel'));
  $('fp-session-name').placeholder = t('sessionNamePlaceholder');
  set('fp-sv-tabs-label', t('tabsLabel'));
  set('fp-sv-select-all', t('selectAll'));
  $('fp-save-confirm').textContent = t('confirmSave');

  // delete confirm modal
  set('fp-confirm-text', t('deleteConfirm'));
  $('fp-modal-cancel').textContent = t('cancel');
  $('fp-modal-confirm').textContent = t('delete');

  // add tabs modal
  set('fp-add-modal-title', t('addTabsTitle'));
  set('fp-add-modal-desc', t('addTabsDesc'));
  $('fp-add-confirm').textContent = t('confirmAdd');

  // share modal
  set('fp-share-desc', t('shareDesc'));
  $('fp-copy-code').textContent = t('copyCode');
  $('fp-copy-urls').textContent = t('copyUrls');

  // import modal
  set('fp-import-title', t('importTitle'));
  set('fp-import-desc', t('importDesc'));
  $('fp-import-code').placeholder = t('importPlaceholder');
  $('fp-do-import').textContent = t('doImport');
  set('fp-import-file-label', t('importFromFile'));
  set('fp-import-error', t('importError'));

  // settings modal
  set('fp-settings-title', t('settingsTitle'));
  set('fp-theme-section-label', t('themeSection'));
  set('fp-theme-dark-label', t('themeDark'));
  set('fp-theme-light-label', t('themeLight'));
  set('fp-theme-green-label', t('themeGreen'));
  set('fp-bg-section-label', t('bgSection'));
  set('fp-bg-color-mode-label', t('bgColorMode'));
  set('fp-bg-image-mode-label', t('bgImageMode'));
  set('fp-bg-color-label', t('bgColorLabel'));
  set('fp-opacity-label', t('opacityLabel'));
  set('fp-img-opacity-label', t('opacityLabel'));
  set('fp-choose-image-label', t('chooseImage'));
  if ($('fp-remove-image')) $('fp-remove-image').textContent = t('removeImage');
  set('fp-lang-section-label', t('langSection'));
  $('fp-settings-save').textContent = t('saveSettings');

  // search placeholder
  $('fp-search').placeholder = t('searchPlaceholder');

  // lang buttons highlight
  document.querySelectorAll('.fp-lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === themeSettings.lang));
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(s) {
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');
  document.querySelectorAll('.fp-theme-preset').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  const bg = $('custom-bg');
  const opacity = (s.bgOpacity ?? 100) / 100;
  if (s.bgMode === 'image' && s.bgImage) {
    bg.style.cssText = `background-image:url(${s.bgImage});background-size:cover;background-position:center;opacity:${opacity}`;
  } else if (s.bgMode === 'color' && s.bgColor) {
    bg.style.cssText = `background-color:${s.bgColor};opacity:${opacity}`;
  } else {
    bg.style.cssText = '';
  }
  const hasBg = (s.bgMode === 'image' && s.bgImage) || (s.bgMode === 'color' && s.bgColor);
  document.documentElement.style.setProperty('--app-opacity', hasBg ? Math.max(0.4, 1 - opacity * 0.5).toFixed(2) : '1');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const escHtml = str => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function faviconUrl(tab) {
  if (tab.favIconUrl?.startsWith('http')) return tab.favIconUrl;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`; } catch { return ''; }
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(themeSettings.lang === 'en' ? 'en-US' : 'zh-CN', { year:'numeric', month:'short', day:'numeric' })
    + ' ' + d.toLocaleTimeString(themeSettings.lang === 'en' ? 'en-US' : 'zh-CN', { hour:'2-digit', minute:'2-digit' });
}
function guessEmoji(name) {
  const n = name.toLowerCase();
  if (/guitar|吉他|music|音乐|bass|piano|钢琴|drum/.test(n)) return '🎸';
  if (/ielts|雅思|english|英语|toefl|托福|french|spanish/.test(n)) return '📚';
  if (/leetcode|code|coding|编程|刷题|algorithm|python|javascript/.test(n)) return '💻';
  if (/work|工作|office|会议|meeting/.test(n)) return '💼';
  if (/video|youtube|bilibili|看视频|movie|电影/.test(n)) return '📺';
  if (/shop|购物|淘宝|京东|amazon/.test(n)) return '🛍️';
  if (/game|游戏/.test(n)) return '🎮';
  if (/cook|食谱|做饭|recipe/.test(n)) return '🍳';
  if (/travel|旅游|trip/.test(n)) return '✈️';
  if (/design|设计|figma|sketch/.test(n)) return '🎨';
  if (/news|新闻/.test(n)) return '📰';
  return '🗂️';
}

// ─── Main view switching ──────────────────────────────────────────────────────
function showMainView(view) {
  $('fp-empty-detail').classList.toggle('hidden', view !== 'empty');
  $('fp-detail').classList.toggle('hidden', view !== 'detail');
  $('fp-save-view').classList.toggle('hidden', view !== 'save');
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar(filter = '') {
  const list = $('fp-session-list');
  const filtered = sessions.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())).slice().reverse();
  const totalTabs = sessions.reduce((sum, s) => sum + s.tabs.length, 0);
  $('fp-stat-sessions').textContent = t('totalSessions', sessions.length);
  $('fp-stat-tabs').textContent = t('totalTabs', totalTabs);
  $('fp-session-count').textContent = filtered.length;
  list.innerHTML = '';
  filtered.forEach(session => {
    const item = document.createElement('div');
    item.className = `fp-session-item${session.id === selectedId ? ' active' : ''}`;
    const dateStr = new Date(session.createdAt).toLocaleDateString(themeSettings.lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
    item.innerHTML = `
      <div class="fp-session-item-icon">${guessEmoji(session.name)}</div>
      <div class="fp-session-item-info">
        <div class="fp-session-item-name">${escHtml(session.name)}</div>
        <div class="fp-session-item-meta">${session.tabs.length} ${themeSettings.lang==='en'?'tabs':'个标签'} · ${dateStr}</div>
      </div>`;
    item.addEventListener('click', () => selectSession(session.id));
    list.appendChild(item);
  });
}

function selectSession(id) {
  selectedId = id;
  renderSidebar($('fp-search').value);
  renderDetail();
}

// ─── Detail ───────────────────────────────────────────────────────────────────
function renderDetail() {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) { showMainView('empty'); return; }
  showMainView('detail');

  $('fp-detail-name').textContent = session.name;
  $('fp-detail-meta').innerHTML = `
    <span class="fp-meta-chip">${t('tabsCount', session.tabs.length)}</span>
    <span class="fp-meta-chip">📅 ${t('savedAt')} ${formatDate(session.createdAt)}</span>`;

  // update action button labels
  $('fp-btn-restore').textContent = t('restoreAll');
  $('fp-btn-add-tabs').textContent = t('addTabs');
  $('fp-btn-share').textContent = t('shareSession');
  $('fp-btn-delete').textContent = t('deleteSession');

  const grid = $('fp-tabs-grid');
  grid.innerHTML = '';
  // apply current layout class
  grid.className = `fp-tabs-grid layout-${currentLayout}`;
  // sync layout buttons
  document.querySelectorAll('.fp-layout-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === currentLayout));

  session.tabs.forEach((tab, idx) => {
    const fav = faviconUrl(tab);
    const card = document.createElement('div');
    card.className = 'fp-tab-card';
    card.innerHTML = `
      ${fav ? `<img class="fp-tab-favicon" src="${fav}" onerror="this.style.display='none'" />` : '<div style="width:20px"></div>'}
      <div class="fp-tab-info">
        <div class="fp-tab-title">${escHtml(tab.title || tab.url)}</div>
        <div class="fp-tab-url">${escHtml(tab.url)}</div>
      </div>
      <button class="fp-tab-open">${t('openTab')}</button>
      <button class="fp-tab-delete" title="✕">✕</button>`;
    card.querySelector('.fp-tab-open').addEventListener('click', () => chrome.tabs.create({ url: tab.url }));
    card.querySelector('.fp-tab-delete').addEventListener('click', () => deleteTabFromSession(session.id, idx));
    grid.appendChild(card);
  });
}

// ─── Layout switcher ──────────────────────────────────────────────────────────
document.querySelectorAll('.fp-layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLayout = btn.dataset.layout;
    localStorage.setItem('tabvault_layout', currentLayout);
    // apply class immediately without full re-render
    const grid = $('fp-tabs-grid');
    grid.className = `fp-tabs-grid layout-${currentLayout}`;
    document.querySelectorAll('.fp-layout-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ─── Delete single tab from session ──────────────────────────────────────────
async function deleteTabFromSession(sessionId, tabIdx) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;
  session.tabs.splice(tabIdx, 1);
  await saveSessions();
  renderDetail();
  renderSidebar($('fp-search').value);
}

// ─── Rename ───────────────────────────────────────────────────────────────────
let _renaming = false;

$('fp-btn-rename').addEventListener('click', () => {
  if (_renaming) return;
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  _renaming = true;

  const nameEl = $('fp-detail-name');   // h2 — keep in DOM, just hide it
  const btn    = $('fp-btn-rename');
  const original = session.name;

  // Create input and insert next to the h2 (don't remove h2 from DOM)
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fp-detail-name-input';
  input.value = original;
  nameEl.style.display = 'none';          // hide h2
  nameEl.insertAdjacentElement('afterend', input);  // insert input after h2
  btn.textContent = '✓';
  btn.style.color = 'var(--primary)';
  input.focus();
  input.select();

  let committed = false;

  const cleanup = () => {
    document.removeEventListener('mousedown', onOutside, true);
    btn.onclick = null;
    btn.textContent = '✏️';   // 恢复编辑图标
    btn.style.color = '';
    _renaming = false;
    // restore h2 visibility before any render
    if (input.parentNode) input.remove();
    nameEl.style.display = '';
  };

  const commit = async () => {
    if (committed) return;
    committed = true;
    const n = input.value.trim();
    cleanup();                              // restores h2 BEFORE renderDetail
    if (n && n !== original) { session.name = n; await saveSessions(); }
    renderSidebar($('fp-search').value);
    renderDetail();
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    cleanup();                              // restores h2 BEFORE renderDetail
    renderDetail();
  };

  // mousedown capture — fires on ANY click target, including non-focusable divs
  const onOutside = e => {
    if (input.contains(e.target) || btn.contains(e.target)) return;
    commit();
  };
  document.addEventListener('mousedown', onOutside, true);

  // ✓ button
  btn.onclick = e => { e.stopPropagation(); commit(); };

  // keyboard
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
});

// ─── Restore ──────────────────────────────────────────────────────────────────
$('fp-btn-restore').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  if (session) chrome.windows.create({ url: session.tabs.map(t => t.url) });
});

// ─── Delete session ───────────────────────────────────────────────────────────
$('fp-btn-delete').addEventListener('click', () => { pendingDeleteId = selectedId; $('fp-confirm-modal').classList.remove('hidden'); });
$('fp-modal-cancel').addEventListener('click', () => $('fp-confirm-modal').classList.add('hidden'));
$('fp-confirm-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-confirm-modal').classList.add('hidden'));
$('fp-modal-confirm').addEventListener('click', async () => {
  sessions = sessions.filter(s => s.id !== pendingDeleteId);
  await saveSessions();
  if (selectedId === pendingDeleteId) selectedId = sessions.length ? sessions[sessions.length-1].id : null;
  pendingDeleteId = null;
  $('fp-confirm-modal').classList.add('hidden');
  renderSidebar($('fp-search').value); renderDetail();
});

// ─── Add tabs to existing session ────────────────────────────────────────────
$('fp-btn-add-tabs').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  const existingUrls = new Set(session.tabs.map(t => t.url));

  chrome.tabs.getCurrent(currentTab => {
    chrome.tabs.query({ currentWindow: true }, allTabs => {
      const extUrl = chrome.runtime.getURL('');
      addCandidateTabs = allTabs.filter(tab =>
        tab.id !== currentTab?.id &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith(extUrl) &&
        !existingUrls.has(tab.url)
      );
      addSelectedIds = new Set(addCandidateTabs.map(t => t.id));

      const listEl = $('fp-add-tabs-list');
      const emptyEl = $('fp-add-empty');
      listEl.innerHTML = '';

      if (addCandidateTabs.length === 0) {
        emptyEl.textContent = t('noNewTabs');
        emptyEl.classList.remove('hidden');
        listEl.classList.add('hidden');
      } else {
        emptyEl.classList.add('hidden');
        listEl.classList.remove('hidden');
        addCandidateTabs.forEach(tab => {
          const fav = faviconUrl(tab);
          const item = document.createElement('div');
          item.className = 'fp-tab-check-item selected';
          item.innerHTML = `
            <input type="checkbox" checked />
            ${fav ? `<img class="fp-tab-check-favicon" src="${fav}" onerror="this.style.display='none'" />` : ''}
            <div class="fp-tab-check-info">
              <div class="fp-tab-check-title">${escHtml(tab.title||'无标题')}</div>
              <div class="fp-tab-check-url">${escHtml(tab.url)}</div>
            </div>`;
          const cb = item.querySelector('input');
          const toggle = (checked) => {
            checked ? addSelectedIds.add(tab.id) : addSelectedIds.delete(tab.id);
            item.classList.toggle('selected', checked);
          };
          cb.addEventListener('change', () => toggle(cb.checked));
          item.addEventListener('click', e => { if (e.target.tagName==='INPUT') return; cb.checked=!cb.checked; toggle(cb.checked); });
          listEl.appendChild(item);
        });
      }
      $('fp-add-modal-title').textContent = t('addTabsTitle');
      $('fp-add-modal-desc').textContent = t('addTabsDesc');
      $('fp-add-confirm').textContent = t('confirmAdd');
      $('fp-add-modal').classList.remove('hidden');
    });
  });
});

$('fp-add-confirm').addEventListener('click', async () => {
  const session = sessions.find(s => s.id === selectedId);
  if (!session) return;
  const toAdd = addCandidateTabs
    .filter(t => addSelectedIds.has(t.id))
    .map(t => ({ url: t.url, title: t.title, favIconUrl: t.favIconUrl }));
  if (toAdd.length) {
    session.tabs.push(...toAdd);
    await saveSessions();
  }
  $('fp-add-modal').classList.add('hidden');
  renderDetail();
  renderSidebar($('fp-search').value);
});
$('fp-add-close').addEventListener('click', () => $('fp-add-modal').classList.add('hidden'));
$('fp-add-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-add-modal').classList.add('hidden'));

// ─── Inline Save Tabs view ────────────────────────────────────────────────────
function getCurrentBrowserTabs() {
  return new Promise(resolve => {
    chrome.tabs.getCurrent(currentTab => {
      chrome.tabs.query({ currentWindow: true }, allTabs => {
        const extUrl = chrome.runtime.getURL('');
        resolve(allTabs.filter(tab =>
          tab.id !== currentTab?.id &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith(extUrl)
        ));
      });
    });
  });
}

async function openSaveView() {
  currentTabs = await getCurrentBrowserTabs();
  selectedTabIds = new Set(currentTabs.map(t => t.id));
  $('fp-session-name').value = '';
  $('fp-tab-count').textContent = selectedTabIds.size;
  $('fp-select-all').checked = true;
  $('fp-select-all').indeterminate = false;
  renderSaveTabList();
  showMainView('save');
  setTimeout(() => $('fp-session-name').focus(), 50);
}

function renderSaveTabList() {
  const list = $('fp-current-tabs');
  list.innerHTML = '';
  $('fp-tab-count').textContent = selectedTabIds.size;
  currentTabs.forEach(tab => {
    const isSelected = selectedTabIds.has(tab.id);
    const item = document.createElement('div');
    item.className = `fp-tab-check-item${isSelected ? ' selected' : ''}`;
    const fav = faviconUrl(tab);
    item.innerHTML = `
      <input type="checkbox" ${isSelected ? 'checked' : ''} />
      ${fav ? `<img class="fp-tab-check-favicon" src="${fav}" onerror="this.style.display='none'" />` : ''}
      <div class="fp-tab-check-info">
        <div class="fp-tab-check-title">${escHtml(tab.title||'无标题')}</div>
        <div class="fp-tab-check-url">${escHtml(tab.url)}</div>
      </div>`;
    const cb = item.querySelector('input');
    const toggle = (checked) => {
      checked ? selectedTabIds.add(tab.id) : selectedTabIds.delete(tab.id);
      item.classList.toggle('selected', checked);
      $('fp-tab-count').textContent = selectedTabIds.size;
      $('fp-select-all').checked = selectedTabIds.size === currentTabs.length;
      $('fp-select-all').indeterminate = selectedTabIds.size > 0 && selectedTabIds.size < currentTabs.length;
    };
    cb.addEventListener('change', () => toggle(cb.checked));
    item.addEventListener('click', e => { if (e.target.tagName==='INPUT') return; cb.checked=!cb.checked; toggle(cb.checked); });
    list.appendChild(item);
  });
}

$('fp-select-all').addEventListener('change', () => {
  const checked = $('fp-select-all').checked;
  currentTabs.forEach(t => checked ? selectedTabIds.add(t.id) : selectedTabIds.delete(t.id));
  renderSaveTabList();
  $('fp-select-all').checked = checked;
});

$('fp-save-confirm').addEventListener('click', async () => {
  const name = $('fp-session-name').value.trim();
  if (!name) {
    $('fp-session-name').style.borderColor = '#ef4444';
    $('fp-session-name').focus();
    setTimeout(() => $('fp-session-name').style.borderColor = '', 1200);
    return;
  }
  if (!selectedTabIds.size) return;
  const tabs = currentTabs.filter(t => selectedTabIds.has(t.id)).map(t => ({ url: t.url, title: t.title, favIconUrl: t.favIconUrl }));
  const newSession = { id: Date.now().toString(), name, tabs, createdAt: new Date().toISOString() };
  sessions.push(newSession);
  await saveSessions();
  selectedId = newSession.id;
  renderSidebar($('fp-search').value);
  renderDetail();
});

$('fp-save-view-cancel').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId);
  showMainView(session ? 'detail' : 'empty');
});
$('fp-session-name').addEventListener('keydown', e => { if (e.key==='Enter') $('fp-save-confirm').click(); if (e.key==='Escape') $('fp-save-view-cancel').click(); });
$('fp-btn-new').addEventListener('click', openSaveView);

// ─── Settings ─────────────────────────────────────────────────────────────────
function openSettings() {
  const s = themeSettings;
  document.querySelectorAll('.fp-theme-preset').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  document.querySelectorAll('.fp-bg-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === s.bgMode));
  $('fp-bg-color-section').classList.toggle('hidden', s.bgMode !== 'color');
  $('fp-bg-image-section').classList.toggle('hidden', s.bgMode !== 'image');
  if (s.bgColor) $('fp-bg-color').value = s.bgColor;
  $('fp-bg-color-opacity').value = s.bgOpacity;
  $('fp-color-opacity-val').textContent = s.bgOpacity + '%';
  if (s.bgImage) { $('fp-bg-img-thumb').src = s.bgImage; $('fp-bg-img-preview').classList.remove('hidden'); }
  else $('fp-bg-img-preview').classList.add('hidden');
  $('fp-bg-image-opacity').value = s.bgOpacity;
  $('fp-image-opacity-val').textContent = s.bgOpacity + '%';
  document.querySelectorAll('.fp-lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === s.lang));
  $('fp-settings-modal').classList.remove('hidden');
}

document.querySelectorAll('.fp-theme-preset').forEach(btn => btn.addEventListener('click', () => { themeSettings.theme = btn.dataset.theme; applyTheme(themeSettings); }));
document.querySelectorAll('.fp-bg-mode-btn').forEach(btn => btn.addEventListener('click', () => {
  themeSettings.bgMode = btn.dataset.mode;
  document.querySelectorAll('.fp-bg-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
  $('fp-bg-color-section').classList.toggle('hidden', btn.dataset.mode !== 'color');
  $('fp-bg-image-section').classList.toggle('hidden', btn.dataset.mode !== 'image');
}));
$('fp-bg-color').addEventListener('input', () => { themeSettings.bgColor = $('fp-bg-color').value; applyTheme(themeSettings); });
$('fp-bg-color-opacity').addEventListener('input', () => { themeSettings.bgOpacity = +$('fp-bg-color-opacity').value; $('fp-color-opacity-val').textContent = themeSettings.bgOpacity + '%'; applyTheme(themeSettings); });
$('fp-bg-image-input').addEventListener('change', () => {
  const file = $('fp-bg-image-input').files[0]; if (!file) return;
  const fr = new FileReader();
  fr.onload = e => { themeSettings.bgImage = e.target.result; $('fp-bg-img-thumb').src = themeSettings.bgImage; $('fp-bg-img-preview').classList.remove('hidden'); applyTheme(themeSettings); };
  fr.readAsDataURL(file);
});
$('fp-remove-image').addEventListener('click', () => { themeSettings.bgImage = ''; $('fp-bg-img-preview').classList.add('hidden'); $('fp-bg-img-thumb').src = ''; $('fp-bg-image-input').value = ''; applyTheme(themeSettings); });
$('fp-bg-image-opacity').addEventListener('input', () => { themeSettings.bgOpacity = +$('fp-bg-image-opacity').value; $('fp-image-opacity-val').textContent = themeSettings.bgOpacity + '%'; applyTheme(themeSettings); });

document.querySelectorAll('.fp-lang-btn').forEach(btn => btn.addEventListener('click', () => {
  themeSettings.lang = btn.dataset.lang;
  t = createT(themeSettings.lang);
  document.querySelectorAll('.fp-lang-btn').forEach(b => b.classList.toggle('active', b === btn));
  applyTranslations();
  renderSidebar($('fp-search').value);
  renderDetail();
}));

$('fp-settings-save').addEventListener('click', () => { saveTheme(); $('fp-settings-modal').classList.add('hidden'); });
$('fp-settings-close').addEventListener('click', () => $('fp-settings-modal').classList.add('hidden'));
$('fp-settings-modal').querySelector('.fp-modal-backdrop').addEventListener('click', () => $('fp-settings-modal').classList.add('hidden'));
$('fp-btn-settings').addEventListener('click', openSettings);

// ─── Collapse ─────────────────────────────────────────────────────────────────
$('fp-btn-collapse').addEventListener('click', () => {
  chrome.tabs.getCurrent(tab => { if (tab) chrome.tabs.remove(tab.id); });
});

// ─── Share ────────────────────────────────────────────────────────────────────
const SHARE_PREFIX = 'TABVAULT_SHARE_V1:';
$('fp-btn-share').addEventListener('click', () => {
  const session = sessions.find(s => s.id === selectedId); if (!session) return;
  sharingSession = session;
  $('fp-share-title').textContent = t('shareModalTitle', session.name);
  $('fp-share-urls').innerHTML = session.tabs.map(tab => `<div class="fp-share-url-item">🔗 ${escHtml(tab.title||tab.url)}</div>`).join('');
  $('fp-share-code').value = SHARE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ name: session.name, tabs: session.tabs }))));
  $('fp-share-modal').classList.remove('hidden');
});
function copyWithFeedback(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent; btn.textContent = t('copied'); btn.classList.add('fp-btn-copied');
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
  const raw = $('fp-import-code').value.trim(); $('fp-import-error').classList.add('hidden');
  if (!raw.startsWith(SHARE_PREFIX)) { $('fp-import-error').classList.remove('hidden'); return; }
  try {
    const { name, tabs } = JSON.parse(decodeURIComponent(escape(atob(raw.slice(SHARE_PREFIX.length)))));
    if (!name || !Array.isArray(tabs)) throw new Error();
    const s = { id: Date.now().toString(), name, tabs, createdAt: new Date().toISOString() };
    sessions.push(s); await saveSessions();
    $('fp-import-modal').classList.add('hidden');
    selectedId = s.id; renderSidebar(); renderDetail();
  } catch { $('fp-import-error').classList.remove('hidden'); }
});
$('fp-import-file').addEventListener('change', async () => {
  const file = $('fp-import-file').files[0]; if (!file) return;
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
      if (lastId) selectedId = lastId;
      renderSidebar(); renderDetail();
    } catch { $('fp-import-error').classList.remove('hidden'); }
  };
  fr.readAsText(file); $('fp-import-file').value = '';
});

// ─── Search ───────────────────────────────────────────────────────────────────
$('fp-search').addEventListener('input', () => renderSidebar($('fp-search').value));

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadAll();
  applyTheme(themeSettings);
  applyTranslations();
  if (sessions.length) selectedId = sessions[sessions.length - 1].id;
  renderSidebar();
  renderDetail();
})();
