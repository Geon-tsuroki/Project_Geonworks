/* =====================================================
   QC STANDARD — main.js
   카페24 board_list.php HTML 파싱 방식
   → 게시글 클릭 시 페이지 이동 없이 같은 .board-container
     안에서 목록 ↔ 상세 내용을 전환
   → 본문은 카페24 read.html의
     .ec-base-table.typeWrite > .detail 에서 추출
   → 제목/날짜는 목록 파싱 시 이미 얻은 article 객체 재사용
===================================================== */

/* ===========================
   설정
=========================== */

const BOARD_NO = 2; // 카페24 게시판 번호

// bullet 라벨
const BULLET_LABELS = ['케이스', 'PCB', 'VENOM', '키캡', '무게추'];

/* ===========================
   유틸
=========================== */

/** 체크 SVG 아이콘 */
function checkIcon() {
    return `<span class="check-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    </span>`;
}

/* ===========================
   게시판 데이터 수집
=========================== */

async function fetchBoardHTML(categoryNo) {
    const url = `https://geonworks.cafe24.com/shop1/front/php/b/board_list.php?board_no=${BOARD_NO}&category_no=${categoryNo}`;

    const res = await fetch(url, {
        credentials: 'same-origin'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

/**
 * 받아온 HTML에서 게시글 정보 추출
 */
function parseArticles(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const articles = [];

    const rowSelectors = [
        'tr.xans-record-',
        'li.xans-record-',
        '.xans-board-list tr',
    ];

    let rows = [];
    for (const sel of rowSelectors) {
        rows = Array.from(doc.querySelectorAll(sel));
        if (rows.length) break;
    }

    rows.forEach(row => {
        const titleEl = row.querySelector('td.title a, td.subject a, .title a, .subject a, a[href*="article_no"]');
        if (!titleEl) return;

        const title = titleEl.textContent.trim();
        const href  = titleEl.getAttribute('href') || '';

        let articleNo = '';
        const noMatch = href.match(/article_no=(\d+)/) || href.match(/\/(\d+)\/?$/);
        if (noMatch) articleNo = noMatch[1];

        const dateEl = row.querySelector('td.date, td.created, .date');
        const date = dateEl ? dateEl.textContent.trim() : '';

        const hitsEl = row.querySelector('td.hit, td.count, td.view, .hit');
        const hits = hitsEl ? hitsEl.textContent.trim() : '';

        const catEl = row.querySelector('td.category, .category');
        const category = catEl ? catEl.textContent.trim() : '';

        articles.push({ title, href, articleNo, date, hits, category });
    });

    return articles;
}

/* ===========================
   렌더링
=========================== */

/** 게시글 목록 → 테이블 HTML (클릭 시 data-index로 article 특정) */
function renderTable(articles) {
    if (!articles.length) {
        return `<div class="board-empty">등록된 게시글이 없습니다.</div>`;
    }

    const rows = articles.map((a, i) => `
        <tr class="board-row" data-index="${i}">
            <td class="col-title">
                <div class="article-title">
                    ${checkIcon()}
                    <span>${a.title}</span>
                </div>
            </td>
            <td class="col-category">${a.category}</td>
            <td class="col-date">${a.date}</td>
            <td class="col-views">조회 ${a.hits}</td>
        </tr>`
    ).join('');

    return `
    <table class="board-table">
        <thead>
            <tr>
                <th class="col-title">제목</th>
                <th class="col-category">카테고리</th>
                <th class="col-date">작성일</th>
                <th class="col-views">조회</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

/**
 * 게시글 상세 내용을 같은 .board-container 안에 렌더링
 * - 제목/날짜는 목록에서 이미 파싱한 article 객체 재사용
 * - 본문만 상세 페이지의 .ec-base-table.typeWrite > .detail 에서 추출
 */
async function loadArticleDetail(container, article) {
    container.innerHTML = `<div class="board-loading">불러오는 중…</div>`;

    try {
        const res = await fetch(article.href, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const doc  = new DOMParser().parseFromString(html, 'text/html');

        // 본문 셀렉터 (스킨 버전별로 래퍼가 다를 수 있어 여러 패턴 시도)
        const contentSelectors = [
            '.xans-board-read .ec-base-table.typeWrite .detail',
            '.ec-base-table.typeWrite .detail',
            '.xans-board-read .detail',
        ];

        let content = '';
        for (const sel of contentSelectors) {
            const el = doc.querySelector(sel);
            if (el) { content = el.innerHTML.trim(); break; }
        }
        if (!content) content = '<p>게시글 내용을 불러올 수 없습니다.</p>';

        // 첨부파일 (displaynone 클래스가 없을 때만 노출)
        const attachEl = doc.querySelector('.attach');
        const attachHTML = (attachEl && !attachEl.classList.contains('displaynone') && attachEl.innerHTML.trim())
            ? `<div class="board-detail-attach">${attachEl.innerHTML.trim()}</div>`
            : '';

        container.innerHTML = `
            <button type="button" class="board-back-btn">← 목록으로</button>
            <div class="board-detail">
                <h3 class="board-detail-title">${article.title}</h3>
                ${article.date ? `<div class="board-detail-date">${article.date}</div>` : ''}
                <div class="board-detail-content">${content}</div>
                ${attachHTML}
            </div>`;
    } catch (err) {
        console.error('게시글 상세 로드 실패:', err);
        container.innerHTML = `
            <button type="button" class="board-back-btn">← 목록으로</button>
            <div class="board-error">
                게시글을 불러오지 못했습니다.<br>
                <small>${err.message}</small>
            </div>`;
    }
}

/** 캐시해둔 목록 HTML로 복귀 */
function showArticleList(container) {
    container.innerHTML = container.dataset.listHtml
        || `<div class="board-empty">목록을 불러올 수 없습니다.</div>`;
}

/** 슬라이드 하나를 비동기로 채움 */
async function loadSlide(slide) {
    const categoryNo = Number(slide.dataset.category);
    const container  = slide.querySelector('.board-container');

    try {
        const html      = await fetchBoardHTML(categoryNo);
        const articles  = parseArticles(html);
        const tableHTML = renderTable(articles);

        container.innerHTML = tableHTML;
        container.dataset.listHtml = tableHTML; // 상세 → 목록 복귀용 캐시
        container.articlesData = articles;      // 행 클릭 시 title/date 재사용

        // 행/뒤로가기 버튼 클릭을 이벤트 위임으로 한 번만 바인딩
        container.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-index]');
            if (row) {
                const article = container.articlesData[Number(row.dataset.index)];
                if (article) loadArticleDetail(container, article);
                return;
            }

            if (e.target.closest('.board-back-btn')) {
                showArticleList(container);
            }
        });
    } catch (err) {
        console.error(`[category ${categoryNo}] 로드 실패:`, err);
        container.innerHTML = `<div class="board-error">
            게시글을 불러오지 못했습니다.<br>
            <small>${err.message}</small>
        </div>`;
    }
}

/* ===========================
   bullet 라벨
=========================== */

function applyBulletLabels() {
    const bullets = document.querySelectorAll('.faq-pagination .swiper-pagination-bullet');
    bullets.forEach((bullet, i) => {
        if (BULLET_LABELS[i] !== undefined) {
            bullet.innerText = BULLET_LABELS[i];
        }
    });
}

/* ===========================
   Swiper 초기화
=========================== */

const faqSwiper = new Swiper('#faq', {
    slidesPerView: 1,
    spaceBetween: 0,

    pagination: {
        el: '.faq-pagination',
        clickable: true,
    },

    on: {
        paginationRender() {
            applyBulletLabels();
        },
        paginationUpdate() {
            applyBulletLabels();
        }
    }
});

/* ===========================
   게시글 로딩 — 지연 로드 전략
=========================== */

const slides = document.querySelectorAll('#faq .swiper-slide');
const loadedSlides = new Set();

async function loadSlideIfNeeded(index) {
    const slide = slides[index];
    if (!slide || loadedSlides.has(index)) return;
    loadedSlides.add(index);
    await loadSlide(slide);
}

// 첫 슬라이드 즉시 로드
loadSlideIfNeeded(0);

// 슬라이드 전환 시 해당 슬라이드 로드
faqSwiper.on('slideChange', function () {
    loadSlideIfNeeded(faqSwiper.activeIndex);
});
