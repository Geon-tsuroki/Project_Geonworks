/* ─── CONFIG ─────────────────────────────────────────────────────────────── */
const SHEET_URL =
  'https://script.google.com/macros/s/AKfycbzo6YSBwxkgyK-SM8hAZk9Eogy5kfHOhrmbYLKS3cUxzhXzHQ3TGykhBXO40i0xNjGGBA/exec';

const REFRESH_INTERVAL_MS = 60_000; // 60초마다 자동 갱신

/* ─── STATE ──────────────────────────────────────────────────────────────── */
let allRows      = [];
let isAdmin      = false;
let refreshTimer = null;

/* ─── COLUMN MAP ─────────────────────────────────────────────────────────────
   스프레드시트 헤더명 → 내부 키 매핑
   실제 헤더가 다를 경우 배열에 추가하세요
──────────────────────────────────────────────────────────────────────────── */
const COL = {
  name:     ['제품명'],
  gbClose:  ['G/B 마감일', 'GB 마감일', 'GB마감일'],
  saleDate: ['판매시작일', '판매 시작일'],
  shipDate: ['예상발송일', '예상 발송일'],
  category: ['분류'],
  maker:    ['제조사'],
  status:   ['상태'],
  note:     ['비고'],
};

function resolveCol(row, aliases) {
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return '';
}

/* ─── 행 유효성 체크 ─────────────────────────────────────────────────────────
   제품명이 비어있으면 해당 행은 출력하지 않음
──────────────────────────────────────────────────────────────────────────── */
function isValidRow(row) {
  return String(resolveCol(row, COL.name)).trim() !== '';
}

/* ─── FETCH (JSONP — Apps Script 리다이렉트/CORS 우회) ───────────────────── */
function fetchData() {
  const btn = document.querySelector('.refresh-btn');
  btn?.classList.add('spinning');

  // 이전 JSONP 스크립트 태그 제거
  const old = document.getElementById('jsonp-script');
  if (old) old.remove();

  const cbName = 'geonworks_cb_' + Date.now();

  // 10초 타임아웃
  const timeout = setTimeout(() => {
    if (window[cbName]) {
      delete window[cbName];
      btn?.classList.remove('spinning');
      showError('데이터를 불러오지 못했습니다. 네트워크 또는 Apps Script 설정을 확인하세요.');
    }
  }, 10000);

  window[cbName] = function (json) {
    clearTimeout(timeout);
    try {
      const raw = Array.isArray(json) ? json : (json.data ?? json.rows ?? []);
      // 제품명이 없는 행 제외 (1~999행 중 빈 행 무시)
      allRows = raw.filter(isValidRow);
      renderTable(allRows);
      updateStats(allRows);
      updateLastUpdated();
    } catch (err) {
      console.error('Parse error:', err);
      showError('데이터 처리 중 오류가 발생했습니다.');
    } finally {
      btn?.classList.remove('spinning');
      delete window[cbName];
    }
  };

  const script = document.createElement('script');
  script.id  = 'jsonp-script';
  script.src = `${SHEET_URL}?callback=${cbName}&t=${Date.now()}`;
  script.onerror = () => {
    clearTimeout(timeout);
    delete window[cbName];
    btn?.classList.remove('spinning');
    showError('스크립트 로드 실패. Apps Script 배포 설정(액세스: 모든 사용자)을 확인하세요.');
  };
  document.head.appendChild(script);
}

function updateLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (!el) return;
  el.textContent = `갱신: ${new Date().toLocaleTimeString('ko-KR')}`;
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchData, REFRESH_INTERVAL_MS);
}

/* ─── RENDER ─────────────────────────────────────────────────────────────── */
function renderTable(rows) {
  const tbody = document.getElementById('tableBody');

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">표시할 데이터가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const name     = resolveCol(row, COL.name);
    const shipDate = resolveCol(row, COL.shipDate);
    const saleDate = resolveCol(row, COL.saleDate);
    const category = resolveCol(row, COL.category);
    const maker    = resolveCol(row, COL.maker);
    const status   = resolveCol(row, COL.status);
    const note     = resolveCol(row, COL.note);

    return `
      <tr style="animation-delay:${Math.min(i, 20) * 0.03}s">
        <td><div class="product-name">${esc(name)}</div></td>
        <td class="td-mono">${fmtDate(shipDate)}</td>
        <td class="td-mono">${fmtDate(saleDate)}</td>
        <td class="td-muted">${esc(category) || '—'}</td>
        <td class="td-muted">${esc(maker) || '—'}</td>
        <td>${renderBadge(status)}</td>
        <td class="td-note">${esc(note) || '—'}</td>
      </tr>`;
  }).join('');
}

function renderBadge(status) {
  if (!status) return '<span class="td-muted">—</span>';
  const s = String(status).trim();
  if (s === 'DONE')              return `<span class="badge badge-done">DONE</span>`;
  if (s === 'In progress')       return `<span class="badge badge-progress">In progress</span>`;
  if (s === 'GB on sale')        return `<span class="badge badge-gb">GB on sale</span>`;
  if (s === 'Preparing to ship') return `<span class="badge badge-ship">Preparing to ship</span>`;
  return `<span class="td-muted">${esc(s)}</span>`;
}

function fmtDate(val) {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str) return '—';
  // Date 파싱 시도 (스프레드시트가 날짜 객체를 ISO 문자열로 내려줄 때)
  const d = new Date(str);
  if (!isNaN(d.getTime()) && str.includes('-')) {
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }
  return str;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── STATS ──────────────────────────────────────────────────────────────── */
function updateStats(rows) {
  const visible = getFilteredRows();
  document.getElementById('statShowing').textContent  = visible.length;
  document.getElementById('statDone').textContent     = rows.filter(r => resolveCol(r, COL.status) === 'DONE').length;
  document.getElementById('statProgress').textContent = rows.filter(r => resolveCol(r, COL.status) === 'In progress').length;
  document.getElementById('statGB').textContent       = rows.filter(r => resolveCol(r, COL.status) === 'GB on sale').length;
  document.getElementById('statShip').textContent     = rows.filter(r => resolveCol(r, COL.status) === 'Preparing to ship').length;
}

/* ─── FILTER ─────────────────────────────────────────────────────────────── */
function getFilteredRows() {
  const search   = (document.getElementById('searchInput')?.value ?? '').toLowerCase();
  const status   = document.getElementById('statusFilter')?.value ?? '';
  const category = document.getElementById('categoryFilter')?.value ?? '';

  return allRows.filter(row => {
    const name  = String(resolveCol(row, COL.name)).toLowerCase();
    const maker = String(resolveCol(row, COL.maker)).toLowerCase();
    const cat   = String(resolveCol(row, COL.category)).trim();
    const st    = String(resolveCol(row, COL.status)).trim();

    const matchSearch   = !search   || name.includes(search) || maker.includes(search);
    const matchStatus   = !status   || st === status;
    const matchCategory = !category || cat === category;

    return matchSearch && matchStatus && matchCategory;
  });
}

function filterTable() {
  const filtered = getFilteredRows();
  renderTable(filtered);
  document.getElementById('statShowing').textContent = filtered.length;
}

/* ─── STAT CARD 클릭 → 필터 ─────────────────────────────────────────────── */
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('click', () => {
    const sel = document.getElementById('statusFilter');
    sel.value = sel.value === card.dataset.filter ? '' : card.dataset.filter;
    filterTable();
  });
});

/* ─── ERROR ──────────────────────────────────────────────────────────────── */
function showError(msg) {
  document.getElementById('tableBody').innerHTML =
    `<tr class="empty-row"><td colspan="8">⚠ ${esc(msg)}</td></tr>`;
}

/* ─── INIT ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  startAutoRefresh();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('adminModal')?.classList.remove('open');
});
