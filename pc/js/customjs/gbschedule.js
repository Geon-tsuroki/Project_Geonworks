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
  updateDate: ['갱신일자', '갱신 일자'],
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

/* ─── 링크 셀 헬퍼 ────────────────────────────────────────────────────────────
   Apps Script에서 하이퍼링크가 걸린 셀은 문자열 대신
   { text: "표시될 텍스트", url: "https://..." } 객체로 내려옴.
   cellText  : 링크 객체든 순수 문자열이든 상관없이 "표시할 텍스트"만 추출
   cellUrl   : 링크가 있으면 URL, 없으면 null
──────────────────────────────────────────────────────────────────────────── */
function cellText(val) {
  if (val && typeof val === 'object' && 'text' in val) return val.text;
  return val;
}

function cellUrl(val) {
  if (val && typeof val === 'object' && 'url' in val) return val.url;
  return null;
}

/* ─── 행 유효성 체크 ─────────────────────────────────────────────────────────
   제품명이 비어있으면 해당 행은 출력하지 않음
──────────────────────────────────────────────────────────────────────────── */
function isValidRow(row) {
  return String(cellText(resolveCol(row, COL.name))).trim() !== '';
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

/**
 * 셀 값(raw)을 렌더링용 HTML 문자열로 변환.
 * - raw가 { text, url } 객체면 <a> 태그로 감싸서 반환
 * - raw가 일반 문자열/숫자면 그대로 escape해서 반환
 * - 값이 없으면 fallback 반환 (기본 '—')
 */
function renderCell(raw, cssClass = '', fallback = '—') {
  const text = cellText(raw);
  const url  = cellUrl(raw);
  const escaped = esc(text);
  const display = escaped || fallback;

  if (url && escaped) {
    const cls = cssClass ? `${cssClass} cell-link` : 'cell-link';
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="${cls}">${display}</a>`;
  }
  return display;
}

function renderTable(rows) {
  const tbody = document.getElementById('tableBody');

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">표시할 데이터가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const nameRaw     = resolveCol(row, COL.name);
    const shipDate    = cellText(resolveCol(row, COL.shipDate));
    const saleDate    = cellText(resolveCol(row, COL.saleDate));
    const categoryRaw = resolveCol(row, COL.category);
    const makerRaw    = resolveCol(row, COL.maker);
    const status      = cellText(resolveCol(row, COL.status));
    const updateDate      = cellText(resolveCol(row, COL.updateDate));
    const noteRaw     = resolveCol(row, COL.note);

    return `
      <tr style="animation-delay:${Math.min(i, 20) * 0.03}s">
        <td><div class="product-name">${renderCell(nameRaw)}</div></td>
        <td class="td-mono">${fmtDate(shipDate)}</td>
        <td class="td-mono">${fmtDate(saleDate)}</td>
        <td class="td-muted">${renderCell(categoryRaw, 'td-muted')}</td>
        <td class="td-muted">${renderCell(makerRaw, 'td-muted')}</td>
        <td>${renderBadge(status)}</td>
        <td class="td-mono">${fmtDate(updateDate)}</td>
        <td class="td-note">${renderCell(noteRaw, 'td-note')}</td>
      </tr>`;
  }).join('');
}

function renderBadge(status) {
  if (!status) return '<span class="td-muted">—</span>';
  const s = String(status).trim();
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
  document.getElementById('statProgress').textContent = rows.filter(r => cellText(resolveCol(r, COL.status)) === 'In progress').length;
  document.getElementById('statGB').textContent       = rows.filter(r => cellText(resolveCol(r, COL.status)) === 'GB on sale').length;
  document.getElementById('statShip').textContent     = rows.filter(r => cellText(resolveCol(r, COL.status)) === 'Preparing to ship').length;
}

/* ─── FILTER ─────────────────────────────────────────────────────────────── */
function getFilteredRows() {
  const search   = (document.getElementById('searchInput')?.value ?? '').toLowerCase();
  const status   = document.getElementById('statusFilter')?.value ?? '';
  const category = document.getElementById('categoryFilter')?.value ?? '';

  return allRows.filter(row => {
    const name  = String(cellText(resolveCol(row, COL.name))).toLowerCase();
    const maker = String(cellText(resolveCol(row, COL.maker))).toLowerCase();
    const cat   = String(cellText(resolveCol(row, COL.category))).trim();
    const st    = String(cellText(resolveCol(row, COL.status))).trim();

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
