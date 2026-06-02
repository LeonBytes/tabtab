// ─── State ────────────────────────────────────────────────────────────────────
let currentTabs = [];
let selectedTabIds = new Set();
let sessions = [];
let pendingDeleteId = null;
let sharingSession = null;
let themeSettings = { theme: 'dark', bgMode: 'color', bgColor: '', bgImage: '', bgOpacity: 100, lang: 'zh' };
let t = createT('zh');

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const btnSave          = $('btn-save');
const btnImport        = $('btn-import');
const btnSettings      = $('btn-settings');
const btnExport        = $('btn-export');
const btnFullpage      = $('btn-fullpage');
const savePanel        = $('save-panel');
const settingsPanel    = $('settings-panel');
const sessionsView     = $('sessions-view');
const btnCancelSave    = $('btn-cancel-save');
const btnCloseSettings = $('btn-close-settings');
const btnConfirmSave   = $('btn-confirm-save');
const btnSaveSettings  = $('btn-save-settings');
const sessionNameInput = $('session-name');
const currentTabsList  = $('current-tabs-list');
const tabCount         = $('tab-count');
const selectAll        = $('select-all');
const sessionsList     = $('sessions-list');
const emptyState       = $('empty-state');
const searchInput      = $('search-input');
const customBg         = $('custom-bg');
const themePresets     = document.querySelectorAll('.theme-preset');
const bgModeBtns       = document.querySelectorAll('.bg-mode-btn');
const bgColorSection   = $('bg-color-section');
const bgImageSection   = $('bg-image-section');
const bgColorPicker    = $('bg-color-picker');
const bgColorOpacity   = $('bg-color-opacity');
const colorOpacityVal  = $('color-opacity-val');
const bgImageInput     = $('bg-image-input');
const bgImagePreview   = $('bg-image-preview');
const bgImageThumb     = $('bg-image-thumb');
const btnRemoveImage   = $('btn-remove-image');
const bgImageOpacity   = $('bg-image-opacity');
const imageOpacityVal  = $('image-opacity-val');
const confirmModal     = $('confirm-modal');
const modalCancel      = $('modal-cancel');
const modalConfirm     = $('modal-confirm');
const shareModal       = $('share-modal');
const shareTitle       = $('share-title');
const shareUrlsList    = $('share-urls-list');
const shareCode        = $('share-code');
const shareClose       = $('share-close');
const btnCopyCode      = $('btn-copy-code');
const btnCopyUrls      = $('btn-copy-urls');
const importModal      = $('import-modal');
const importClose      = $('import-close');
const importCode       = $('import-code');
const importError      = $('import-error');
const btnDoImport      = $('btn-do-import');
const importFileInput  = $('import-file-input');

// ─── Storage ──────────────────────────────────────────────────────────────────
const loadSessions = () => new Promise(r => chrome.storage.local.get('tabvault_sessions', d => { sessions = d.tabvault_sessions || []; r(); }));
const saveSessions = () => new Promise(r => chrome.storage.local.set({ tabvault_sessions: sessions }, r));
const loadTheme = () => new Promise(r => chrome.storage.local.get('tabvault_theme', d => { if (d.tabvault_theme) themeSettings = { ...themeSettings, ...d.tabvault_theme }; r(); }));
const loadBgImage = () => new Promise(r => chrome.storage.local.get('tabvault_bg_image', d => { if (d.tabvault_bg_image) themeSettings.bgImage = d.tabvault_bg_image; r(); }));

function saveTheme() {
  chrome.storage.local.set({ tabvault_theme: { ...themeSettings, bgImage: '' } });
  if (themeSettings.bgImage) chrome.storage.local.set({ tabvault_bg_image: themeSettings.bgImage });
  else chrome.storage.local.remove('tabvault_bg_image');
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
function applyTranslations() {
  t = createT(themeSettings.lang);
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  const setHtml = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

  set('t-save', t('saveBtn'));
  set('t-import', t('importBtn'));
  setHtml('btn-export', t('exportBtn'));
  searchInput.placeholder = t('searchPlaceholder');
  set('t-savePanelTitle', t('savePanelTitle'));
  set('t-sessionNameLabel', t('sessionNameLabel'));
  sessionNameInput.placeholder = t('sessionNamePlaceholder');
  set('t-tabsLabel', t('tabsLabel'));
  set('t-selectAll', t('selectAll'));
  btnConfirmSave.textContent = t('confirmSave');
  set('t-settingsTitle', t('settingsTitle'));
  set('t-themeSection', t('themeSection'));
  set('t-themeDark', t('themeDark'));
  set('t-themeLight', t('themeLight'));
  set('t-themeGreen', t('themeGreen'));
  set('t-bgSection', t('bgSection'));
  set('t-bgColorMode', t('bgColorMode'));
  set('t-bgImageMode', t('bgImageMode'));
  set('t-bgColorLabel', t('bgColorLabel'));
  set('t-opacityLabel', t('opacityLabel'));
  set('t-imgOpacityLabel', t('opacityLabel'));
  set('t-chooseImage', t('chooseImage'));
  btnSaveSettings.textContent = t('saveSettings');
  set('t-emptyTitle', t('emptyTitle'));
  set('t-emptyDesc', t('emptyDesc'));
  set('t-deleteConfirm', t('deleteConfirm'));
  modalCancel.textContent = t('cancel');
  modalConfirm.textContent = t('delete');
  set('t-shareDesc', t('shareDesc'));
  btnCopyCode.textContent = t('copyCode');
  btnCopyUrls.textContent = t('copyUrls');
  set('t-importTitle', t('importTitle'));
  set('t-importDesc', t('importDesc'));
  importCode.placeholder = t('importPlaceholder');
  btnDoImport.textContent = t('doImport');
  set('t-importFromFile', t('importFromFile'));
  set('t-importError', t('importError'));
  btnFullpage.title = t('expandBtn');

  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === themeSettings.lang));
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(s) {
  document.documentElement.setAttribute('data-theme', s.theme);
  themePresets.forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  const opacity = (s.bgOpacity ?? 100) / 100;
  if (s.bgMode === 'image' && s.bgImage) {
    customBg.style.cssText = `background-image:url(${s.bgImage});background-size:cover;background-position:center;opacity:${opacity}`;
  } else if (s.bgMode === 'color' && s.bgColor) {
    customBg.style.cssText = `background-color:${s.bgColor};opacity:${opacity}`;
  } else {
    customBg.style.cssText = '';
  }
  const hasBg = (s.bgMode === 'image' && s.bgImage) || (s.bgMode === 'color' && s.bgColor);
  document.documentElement.style.setProperty('--app-opacity', hasBg ? Math.max(0.4, 1 - opacity * 0.5).toFixed(2) : '1');
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function openSettingsPanel() {
  const s = themeSettings;
  themePresets.forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  bgModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === s.bgMode));
  bgColorSection.classList.toggle('hidden', s.bgMode !== 'color');
  bgImageSection.classList.toggle('hidden', s.bgMode !== 'image');
  if (s.bgColor) bgColorPicker.value = s.bgColor;
  bgColorOpacity.value = s.bgOpacity;
  colorOpacityVal.textContent = s.bgOpacity + '%';
  if (s.bgImage) { bgImageThumb.src = s.bgImage; bgImagePreview.classList.remove('hidden'); }
  else bgImagePreview.classList.add('hidden');
  bgImageOpacity.value = s.bgOpacity;
  imageOpacityVal.textContent = s.bgOpacity + '%';
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === s.lang));
  savePanel.classList.add('hidden');
  sessionsView.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
}
function closeSettingsPanel() { settingsPanel.classList.add('hidden'); sessionsView.classList.remove('hidden'); }

themePresets.forEach(btn => btn.addEventListener('click', () => {
  themeSettings.theme = btn.dataset.theme;
  applyTheme(themeSettings);
}));
bgModeBtns.forEach(btn => btn.addEventListener('click', () => {
  themeSettings.bgMode = btn.dataset.mode;
  bgModeBtns.forEach(b => b.classList.toggle('active', b === btn));
  bgColorSection.classList.toggle('hidden', btn.dataset.mode !== 'color');
  bgImageSection.classList.toggle('hidden', btn.dataset.mode !== 'image');
}));
bgColorPicker.addEventListener('input', () => { themeSettings.bgColor = bgColorPicker.value; applyTheme(themeSettings); });
bgColorOpacity.addEventListener('input', () => { themeSettings.bgOpacity = +bgColorOpacity.value; colorOpacityVal.textContent = themeSettings.bgOpacity + '%'; applyTheme(themeSettings); });
bgImageInput.addEventListener('change', () => {
  const file = bgImageInput.files[0];
  if (!file) return;
  new FileReader().addEventListener && (() => {
    const fr = new FileReader();
    fr.onload = e => { themeSettings.bgImage = e.target.result; bgImageThumb.src = themeSettings.bgImage; bgImagePreview.classList.remove('hidden'); applyTheme(themeSettings); };
    fr.readAsDataURL(file);
  })();
  const fr = new FileReader();
  fr.onload = e => { themeSettings.bgImage = e.target.result; bgImageThumb.src = themeSettings.bgImage; bgImagePreview.classList.remove('hidden'); applyTheme(themeSettings); };
  fr.readAsDataURL(file);
});
btnRemoveImage.addEventListener('click', () => { themeSettings.bgImage = ''; bgImagePreview.classList.add('hidden'); bgImageThumb.src = ''; bgImageInput.value = ''; applyTheme(themeSettings); });
bgImageOpacity.addEventListener('input', () => { themeSettings.bgOpacity = +bgImageOpacity.value; imageOpacityVal.textContent = themeSettings.bgOpacity + '%'; applyTheme(themeSettings); });
document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => {
  themeSettings.lang = btn.dataset.lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b === btn));
  applyTranslations();
  renderSessions(searchInput.value);
}));

// ─── Tab rendering ────────────────────────────────────────────────────────────
function getCurrentTabs() {
  return new Promise(r => chrome.runtime.sendMessage({ action: 'GET_CURRENT_TABS' }, res => r(res?.tabs || [])));
}
function faviconUrl(tab) {
  if (tab.favIconUrl?.startsWith('http')) return tab.favIconUrl;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`; } catch { return ''; }
}

function renderCurrentTabs() {
  currentTabsList.innerHTML = '';
  tabCount.textContent = selectedTabIds.size;
  currentTabs.forEach(tab => {
    const isSelected = selectedTabIds.has(tab.id);
    const item = document.createElement('div');
    item.className = `tab-item ${isSelected ? 'selected' : ''}`;
    const fav = faviconUrl(tab);
    item.innerHTML = `<input type="checkbox" ${isSelected ? 'checked' : ''} />
      ${fav ? `<img class="tab-favicon" src="${fav}" onerror="this.style.display='none'" />` : ''}
      <div class="tab-info"><div class="tab-title">${escHtml(tab.title||'无标题')}</div><div class="tab-url">${escHtml(tab.url)}</div></div>`;
    const cb = item.querySelector('input');
    cb.addEventListener('change', () => toggleTab(tab.id, cb.checked, item));
    item.addEventListener('click', e => { if (e.target.tagName==='INPUT') return; cb.checked=!cb.checked; toggleTab(tab.id,cb.checked,item); });
    currentTabsList.appendChild(item);
  });
}
function toggleTab(tabId, checked, item) {
  checked ? selectedTabIds.add(tabId) : selectedTabIds.delete(tabId);
  item.classList.toggle('selected', checked);
  tabCount.textContent = selectedTabIds.size;
  selectAll.checked = selectedTabIds.size === currentTabs.length;
  selectAll.indeterminate = selectedTabIds.size > 0 && selectedTabIds.size < currentTabs.length;
}

// ─── Sessions rendering ───────────────────────────────────────────────────────
function renderSessions(filter = '') {
  const filtered = sessions.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())).slice().reverse();
  sessionsList.innerHTML = '';
  emptyState.classList.toggle('hidden', filtered.length > 0);
  if (!filtered.length) return;

  filtered.forEach(session => {
    const card = document.createElement('div');
    card.className = 'session-card';
    const date = new Date(session.createdAt);
    const dateStr = date.toLocaleDateString(themeSettings.lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString(themeSettings.lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
    const favicons = session.tabs.slice(0,8).map(tab => {
      const fav = tab.favIconUrl?.startsWith('http') ? tab.favIconUrl : `https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(tab.url).hostname } catch { return '' } })()}&sz=32`;
      return `<img class="favicon-sm" src="${fav}" title="${escHtml(tab.title)}" onerror="this.style.display='none'" />`;
    }).join('');
    card.innerHTML = `
      <div class="session-card-header">
        <div class="session-name">${escHtml(session.name)}</div>
        <button class="card-action-btn btn-edit" title="✏️">✏️</button>
        <button class="card-action-btn btn-share" title="🔗">🔗</button>
      </div>
      <div class="session-meta">
        <span class="meta-chip">${t('tabsCount', session.tabs.length)}</span>
        <span class="meta-chip">📅 ${dateStr} ${timeStr}</span>
      </div>
      <div class="session-favicons">${favicons}</div>
      <div class="session-card-footer">
        <button class="btn-restore">${t('restore')}</button>
        <button class="btn-card-icon danger">🗑</button>
      </div>`;
    card.querySelector('.btn-restore').addEventListener('click', () => restoreSession(session.id));
    card.querySelector('.danger').addEventListener('click', () => confirmDelete(session.id));
    card.querySelector('.btn-edit').addEventListener('click', () => startEditName(session.id, card));
    card.querySelector('.btn-share').addEventListener('click', () => openShareModal(session.id));
    sessionsList.appendChild(card);
  });
}

// ─── Edit name ────────────────────────────────────────────────────────────────
function startEditName(id, card) {
  const nameEl = card.querySelector('.session-name');
  const editBtn = card.querySelector('.btn-edit');
  const original = sessions.find(s => s.id === id)?.name || '';
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'session-name-input'; input.value = original;
  nameEl.replaceWith(input); editBtn.textContent = '✓';
  input.focus(); input.select();
  const commit = async () => {
    const n = input.value.trim();
    if (n && n !== original) { const s = sessions.find(s => s.id === id); if (s) { s.name = n; await saveSessions(); } }
    renderSessions(searchInput.value);
  };
  editBtn.onclick = commit;
  input.addEventListener('keydown', e => { if (e.key==='Enter') commit(); if (e.key==='Escape') renderSessions(searchInput.value); });
  input.addEventListener('blur', e => { if (e.relatedTarget !== editBtn) commit(); });
}

// ─── Save session ─────────────────────────────────────────────────────────────
async function openSavePanel() {
  currentTabs = await getCurrentTabs();
  selectedTabIds = new Set(currentTabs.map(t => t.id));
  renderCurrentTabs();
  selectAll.checked = true; selectAll.indeterminate = false; sessionNameInput.value = '';
  settingsPanel.classList.add('hidden'); sessionsView.classList.add('hidden'); savePanel.classList.remove('hidden');
  sessionNameInput.focus();
}
function closeSavePanel() { savePanel.classList.add('hidden'); sessionsView.classList.remove('hidden'); }
async function confirmSave() {
  const name = sessionNameInput.value.trim();
  if (!name) { sessionNameInput.focus(); sessionNameInput.style.borderColor='#ef4444'; setTimeout(()=>sessionNameInput.style.borderColor='',1200); return; }
  if (!selectedTabIds.size) return;
  const tabs = currentTabs.filter(t=>selectedTabIds.has(t.id)).map(t=>({url:t.url,title:t.title,favIconUrl:t.favIconUrl}));
  sessions.push({ id: Date.now().toString(), name, tabs, createdAt: new Date().toISOString() });
  await saveSessions(); closeSavePanel(); renderSessions(searchInput.value);
}

// ─── Restore / Delete ─────────────────────────────────────────────────────────
function restoreSession(id) {
  const s = sessions.find(s=>s.id===id);
  if (s) chrome.runtime.sendMessage({ action:'RESTORE_SESSION', urls: s.tabs.map(t=>t.url) });
}
function confirmDelete(id) { pendingDeleteId=id; confirmModal.classList.remove('hidden'); }
async function deleteSession() {
  sessions = sessions.filter(s=>s.id!==pendingDeleteId);
  await saveSessions(); pendingDeleteId=null; confirmModal.classList.add('hidden'); renderSessions(searchInput.value);
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportSessions() {
  if (!sessions.length) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),sessions},null,2)],{type:'application/json'})),
    download: `tabvault-backup-${new Date().toISOString().slice(0,10)}.json`
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ─── Share ────────────────────────────────────────────────────────────────────
const SHARE_PREFIX = 'TABVAULT_SHARE_V1:';
function openShareModal(id) {
  sharingSession = sessions.find(s=>s.id===id);
  if (!sharingSession) return;
  shareTitle.textContent = t('shareModalTitle', sharingSession.name);
  shareUrlsList.innerHTML = sharingSession.tabs.map(tab=>`<div class="share-url-item">🔗 ${escHtml(tab.title||tab.url)}</div>`).join('');
  shareCode.value = SHARE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({name:sharingSession.name,tabs:sharingSession.tabs}))));
  shareModal.classList.remove('hidden');
}
function closeShareModal() { shareModal.classList.add('hidden'); sharingSession=null; }
function copyWithFeedback(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig=btn.textContent; btn.textContent=t('copied'); btn.classList.add('btn-copied');
    setTimeout(()=>{ btn.textContent=orig; btn.classList.remove('btn-copied'); },1800);
  });
}

// ─── Import ───────────────────────────────────────────────────────────────────
function openImportModal() { importCode.value=''; importError.classList.add('hidden'); importModal.classList.remove('hidden'); importCode.focus(); }
function closeImportModal() { importModal.classList.add('hidden'); }

async function doImportFromCode(raw) {
  importError.classList.add('hidden');
  if (!raw.startsWith(SHARE_PREFIX)) { importError.classList.remove('hidden'); return false; }
  try {
    const json = decodeURIComponent(escape(atob(raw.slice(SHARE_PREFIX.length))));
    const { name, tabs } = JSON.parse(json);
    if (!name || !Array.isArray(tabs)) throw new Error();
    sessions.push({ id: Date.now().toString(), name, tabs, createdAt: new Date().toISOString() });
    await saveSessions(); return true;
  } catch { importError.classList.remove('hidden'); return false; }
}

async function doImportFromFile(file) {
  importError.classList.add('hidden');
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        // Support both export format { sessions: [...] } and share format
        const list = Array.isArray(data.sessions) ? data.sessions : null;
        if (list && list.length) {
          for (const s of list) {
            if (s.name && Array.isArray(s.tabs)) {
              sessions.push({ id: Date.now().toString() + Math.random(), name: s.name, tabs: s.tabs, createdAt: s.createdAt || new Date().toISOString() });
            }
          }
          await saveSessions(); resolve(true);
        } else { importError.classList.remove('hidden'); resolve(false); }
      } catch { importError.classList.remove('hidden'); resolve(false); }
    };
    fr.readAsText(file);
  });
}

btnDoImport.addEventListener('click', async () => {
  const ok = await doImportFromCode(importCode.value.trim());
  if (ok) { closeImportModal(); renderSessions(searchInput.value); }
});
importCode.addEventListener('keydown', e => { if (e.key==='Enter' && e.ctrlKey) btnDoImport.click(); });
importFileInput.addEventListener('change', async () => {
  const file = importFileInput.files[0];
  if (!file) return;
  const ok = await doImportFromFile(file);
  if (ok) { closeImportModal(); renderSessions(searchInput.value); }
  importFileInput.value = '';
});

// ─── Full page ────────────────────────────────────────────────────────────────
function openFullPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/fullpage/fullpage.html') });
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Event listeners ──────────────────────────────────────────────────────────
btnSave.addEventListener('click', openSavePanel);
btnCancelSave.addEventListener('click', closeSavePanel);
btnConfirmSave.addEventListener('click', confirmSave);
btnSettings.addEventListener('click', openSettingsPanel);
btnCloseSettings.addEventListener('click', closeSettingsPanel);
btnSaveSettings.addEventListener('click', () => { saveTheme(); closeSettingsPanel(); });
btnExport.addEventListener('click', exportSessions);
btnImport.addEventListener('click', openImportModal);
btnFullpage.addEventListener('click', openFullPage);
sessionNameInput.addEventListener('keydown', e => { if (e.key==='Enter') confirmSave(); if (e.key==='Escape') closeSavePanel(); });
selectAll.addEventListener('change', () => {
  const checked=selectAll.checked;
  currentTabs.forEach(t => checked ? selectedTabIds.add(t.id) : selectedTabIds.delete(t.id));
  renderCurrentTabs(); selectAll.checked=checked;
});
searchInput.addEventListener('input', () => renderSessions(searchInput.value));
modalCancel.addEventListener('click', () => { confirmModal.classList.add('hidden'); pendingDeleteId=null; });
modalConfirm.addEventListener('click', deleteSession);
confirmModal.querySelector('.modal-backdrop').addEventListener('click', () => { confirmModal.classList.add('hidden'); pendingDeleteId=null; });
btnCopyCode.addEventListener('click', () => copyWithFeedback(btnCopyCode, shareCode.value));
btnCopyUrls.addEventListener('click', () => {
  if (!sharingSession) return;
  copyWithFeedback(btnCopyUrls, `【${sharingSession.name}】\n` + sharingSession.tabs.map(t=>t.url).join('\n'));
});
shareClose.addEventListener('click', closeShareModal);
shareModal.querySelector('.modal-backdrop').addEventListener('click', closeShareModal);
importClose.addEventListener('click', closeImportModal);
importModal.querySelector('.modal-backdrop').addEventListener('click', closeImportModal);

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadTheme();
  await loadBgImage();
  t = createT(themeSettings.lang);
  applyTheme(themeSettings);
  applyTranslations();
  await loadSessions();
  renderSessions();
})();
