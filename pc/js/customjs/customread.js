(function () {
    'use strict';

    /* ════════════════════════════════════════════════════════════
       설정값
    ════════════════════════════════════════════════════════════ */
    var BOARD_FOLDER = {
        '1002': 'venom-mx-pcb-manual',
        '3001': 'venom-he-pcb-manual'
    };

    /* ── 섹션 A: 카테고리 번호 → 게시글 번호 ── */
    var SECTION_A_MAP = {
        '1002': { '1': '1594', '2': '1597', '3': '1598', '4': '1599', '5': '1600' },
        '3001': { '1': '1601', '2': '1602', '3': '1603', '4': '1604', '5': '1605' }
    };

    /* ── 섹션 B: 게시글 번호 목록 (3001번 전용) ── */
    var SECTION_B_ARTICLES = ['1869', '1870', '1871', '1872', '1873', '1874'];

    /* ── 섹션 B 전환 트리거: 이 게시글 번호에 진입하면 섹션 B로 전환 ── */
    var SECTION_B_ARTICLE_SET = {};
    SECTION_B_ARTICLES.forEach(function (no) { SECTION_B_ARTICLE_SET[no] = true; });

    /* ── 섹션 B 제목/설명 ── */
    var SECTION_B_TITLE = 'VENOM.HOW GUIDE';
    var SECTION_B_DESC  = 'VENOM.HOW에 관한 가이드입니다.';

    /* ── AJAX 교체 대상 게시판 ── */
    var AJAX_SWAP_BOARDS = ['1002', '3001'];

    /* ── Swiper 인스턴스 ── */
    var categorySwiper = null;

    /* ── 현재 섹션 상태 ── */
    var currentSection = 'A';

    /* ════════════════════════════════════════════════════════════
       초기 진입 시 실행
    ════════════════════════════════════════════════════════════ */
    function buildCategoryList() {
        var select = document.querySelector('.boardSort select');
        var list   = document.getElementById('categoryList');
        var wrap   = document.getElementById('manual_category');

        if (!select || !list) {
            if (wrap) wrap.style.display = 'none';
            return;
        }

        /* ── URL에서 게시판 번호, 게시글 번호 추출 ── */
        var pathMatch  = window.location.pathname.match(/\/article\/[^\/]+\/(\d+)\/(\d+)\//);
        var boardNo    = pathMatch ? pathMatch[1] : null;
        var articleNo  = pathMatch ? pathMatch[2] : '';

        if (!boardNo) {
            var p = new URLSearchParams(window.location.search);
            boardNo   = p.get('board_no') || '';
            articleNo = p.get('no') || '';
        }

        /* ── 처리 대상 게시판이 아니면 숨김 ── */
        if (AJAX_SWAP_BOARDS.indexOf(boardNo) === -1) {
            if (wrap) wrap.style.display = 'none';
            return;
        }

        /* ── 진입 게시글이 섹션 B에 해당하면 섹션 B로 바로 렌더링 ── */
        if (boardNo === '3001' && SECTION_B_ARTICLE_SET[articleNo]) {
            currentSection = 'B';
            updateTitle(SECTION_B_TITLE, SECTION_B_DESC);
            renderSectionB(list, boardNo, articleNo);
        } else {
            currentSection = 'A';
            renderSectionA(select, list, boardNo, articleNo);
        }
    }

    /* ════════════════════════════════════════════════════════════
       섹션 A 렌더링 (select → li)
    ════════════════════════════════════════════════════════════ */
    function renderSectionA(select, list, boardNo, currentArticle) {
        var folder = BOARD_FOLDER[boardNo];
        var catMap = SECTION_A_MAP[boardNo] || {};

        list.innerHTML = '';
        destroySwiper();

        Array.from(select.options).forEach(function (option) {
            if (!option.value || option.value === '0') return;

            /* ── 섹션 B 진입용 카테고리(6번~)는 섹션 A 리스트에서 제외 ── */
            var mappedArticle = catMap[option.value];
            if (!mappedArticle) return;

            var li = document.createElement('li');
            li.classList.add('swiper-slide');

            var a         = document.createElement('a');
            var targetUrl = '/skin-skin4/article/' + folder + '/' + boardNo + '/' + mappedArticle + '/';
            a.href = targetUrl;

            if (mappedArticle === currentArticle) li.classList.add('active');

            var span = document.createElement('span');
            span.textContent = option.text;
            a.appendChild(span);
            li.appendChild(a);
            list.appendChild(li);

            a.addEventListener('click', function (e) {
                e.preventDefault();
                if (li.classList.contains('active')) return;
                loadArticleContent(targetUrl, li, list, boardNo, mappedArticle);
            });
        });

        

        initSwiper();
    }

    /* ════════════════════════════════════════════════════════════
       섹션 B 렌더링 (게시글 제목을 병렬 fetch로 가져옴)
    ════════════════════════════════════════════════════════════ */
    function renderSectionB(list, boardNo, currentArticle) {
        var folder = BOARD_FOLDER[boardNo];

        list.innerHTML = '';
        destroySwiper();

        /* ── 로딩 placeholder ── */
        SECTION_B_ARTICLES.forEach(function (articleNo) {
            var li = document.createElement('li');
            li.classList.add('swiper-slide');
            li.setAttribute('data-article', articleNo);
            li.innerHTML = '<a href="#"><span>불러오는 중...</span></a>';
            if (articleNo === currentArticle) li.classList.add('active');
            list.appendChild(li);
        });

        initSwiper();

        /* ── 6개 게시글 제목 병렬 fetch ── */
        var fetchPromises = SECTION_B_ARTICLES.map(function (articleNo) {
            var url = '/skin-skin4/article/' + folder + '/' + boardNo + '/' + articleNo + '/';
            return fetch(url, { credentials: 'same-origin' })
                .then(function (res) { return res.text(); })
                .then(function (html) {
                    var doc   = new DOMParser().parseFromString(html, 'text/html');
                    /* ── 게시글 제목 추출 (.ec-base-table 내 첫 번째 제목 또는 <title> 태그 활용 ── */
                    var subjectEl = doc.querySelector('.ec-base-table.typeWrite h3.displaynone');
                    var title = subjectEl ? subjectEl.textContent.trim() : articleNo;
                    return { articleNo: articleNo, title: title, url: url };
                })
                .catch(function () {
                    return { articleNo: articleNo, title: articleNo, url: '/skin-skin4/article/' + folder + '/' + boardNo + '/' + articleNo + '/' };
                });
        });

        Promise.all(fetchPromises).then(function (results) {
            results.forEach(function (item) {
                var li = list.querySelector('[data-article="' + item.articleNo + '"]');
                if (!li) return;

                var a        = document.createElement('a');
                a.href       = item.url;
                var span     = document.createElement('span');
                span.textContent = item.title;
                a.appendChild(span);

                /* li 내용 교체 */
                li.innerHTML = '';
                li.appendChild(a);

                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (li.classList.contains('active')) return;
                    loadArticleContent(item.url, li, list, boardNo, item.articleNo);
                });
            });

            /* Swiper 업데이트 */
            if (categorySwiper) categorySwiper.update();
        });
    }

    /* ════════════════════════════════════════════════════════════
       섹션 A → 섹션 B 전환
    ════════════════════════════════════════════════════════════ */
    function switchToSectionB(list, boardNo, firstArticle, triggerLi) {
        currentSection = 'B';

        /* ── 제목/설명 교체 ── */
        updateTitle(SECTION_B_TITLE, SECTION_B_DESC);

        /* ── 본문 교체 ── */
        var firstUrl = '/skin-skin4/article/' + BOARD_FOLDER[boardNo] + '/' + boardNo + '/' + firstArticle + '/';
        loadArticleContent(firstUrl, null, list, boardNo, firstArticle, true);

        /* ── 카테고리 리스트를 섹션 B로 교체 ── */
        renderSectionB(list, boardNo, firstArticle);
    }

    /* ════════════════════════════════════════════════════════════
       제목/설명 DOM 교체
    ════════════════════════════════════════════════════════════ */
    function updateTitle(title, desc) {
        var h2 = document.querySelector('.titleArea h2');
        var p  = document.querySelector('.titleArea .explain');
        if (h2) h2.textContent = title;
        if (p)  p.textContent  = desc;
    }

    /* ════════════════════════════════════════════════════════════
       AJAX 본문 교체
    ════════════════════════════════════════════════════════════ */
    function loadArticleContent(url, clickedLi, list, boardNo, articleNo, skipActive) {
        var detailEl = document.querySelector('.detail');
        if (detailEl) detailEl.style.opacity = '0.4';

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (html) {
                var parser = new DOMParser();
                var doc    = parser.parseFromString(html, 'text/html');

                /* ── 본문 교체 ── */
                var newDetail = doc.querySelector('.detail');
                var curDetail = document.querySelector('.detail');
                if (newDetail && curDetail) {
                    curDetail.innerHTML    = newDetail.innerHTML;
                    curDetail.style.opacity = '';
                }

                /* ── 첨부파일 교체 ── */
                var newAttach = doc.querySelector('.attach');
                var curAttach = document.querySelector('.attach');
                if (newAttach && curAttach) curAttach.innerHTML = newAttach.innerHTML;

                /* ── 수정 버튼 교체 ── */
                var newActions = doc.querySelector('.ec-base-button.gBottom.gBreak');
                var curActions = document.querySelector('.ec-base-button.gBottom.gBreak');
                if (newActions && curActions) curActions.innerHTML = newActions.innerHTML;

                /* ── active 클래스 갱신 ── */
                if (!skipActive && clickedLi) {
                    Array.from(list.children).forEach(function (li) {
                        li.classList.remove('active');
                    });
                    clickedLi.classList.add('active');
                }

                /* ── URL 갱신 ── */
                if (window.history && window.history.pushState) {
                    window.history.pushState({}, '', url);
                }
            })
            .catch(function (err) {
                console.error('게시글 로드 실패:', err);
                if (detailEl) detailEl.style.opacity = '';
                window.location.href = url;
            });
    }

    /* ════════════════════════════════════════════════════════════
       Swiper 유틸
    ════════════════════════════════════════════════════════════ */
    function initSwiper() {
        categorySwiper = new Swiper('.categorySwiper', {
            slidesPerView : 'auto',
            spaceBetween  : 10,
            freeMode      : true,
            grabCursor    : true,
            mousewheel    : { forceToAxis: true }
        });
    }

    function destroySwiper() {
        if (categorySwiper) {
            categorySwiper.destroy(true, true);
            categorySwiper = null;
        }
    }

    /* ════════════════════════════════════════════════════════════
       초기 실행
    ════════════════════════════════════════════════════════════ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildCategoryList);
    } else {
        buildCategoryList();
    }
})();
