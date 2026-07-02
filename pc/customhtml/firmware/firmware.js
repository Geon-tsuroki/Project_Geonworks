/* =====================================================
   펌웨어 자료실 — firmware.js
   모바일 환경에서만 영상 Swiper 초기화
   iframe ↔ Swiper 터치 이벤트 충돌 해결:
     드래그 시작 → #video-swiper에 .is-swiping 추가
               → .video-frame::after 오버레이가 iframe 이벤트 차단
     드래그 종료 → .is-swiping 제거 → 영상 조작 복원
===================================================== */

(function () {

    const MOBILE_BP = 1024;
    let videoSwiper = null;

    function initVideoSwiper() {
        if (videoSwiper) return;

        const swiperEl = document.querySelector('#video-swiper');

        videoSwiper = new Swiper('#video-swiper', {
            slidesPerView: 1,
            spaceBetween: 0,
            loop: false,

            // 터치 감도 높이기 — 짧은 스와이프도 인식
            threshold: 5,
            touchRatio: 1,
            touchAngle: 45,

            pagination: {
                el: '.video-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
              },

            on: {
                // 드래그 시작 → 오버레이 활성화
                touchStart: function () {
                    swiperEl.classList.add('is-swiping');
                },

                // 드래그 종료 → 오버레이 비활성화
                touchEnd: function () {
                    swiperEl.classList.remove('is-swiping');
                },

                // 슬라이드 전환 시 이전 영상 일시정지
                slideChangeTransitionStart: function () {
                    pauseAllVideos();
                }
            }
        });
    }

    function destroyVideoSwiper() {
        if (!videoSwiper) return;
        videoSwiper.destroy(true, true);
        videoSwiper = null;
    }

    function pauseAllVideos() {
        const iframes = document.querySelectorAll('#video-swiper iframe');
        iframes.forEach(iframe => {
            iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
                '*'
            );
        });
    }

    function handleResize() {
        if (window.innerWidth < MOBILE_BP) {
            initVideoSwiper();
        } else {
            destroyVideoSwiper();
        }
    }

    handleResize();

    let resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 150);
    });

})();


/* =====================================================
   게시글 상세 AJAX 로딩
   - 게시글 클릭 시 페이지 이동 없이 .board-section 내부만 교체
   - 상단에 "목록으로" 버튼 자동 삽입 → 클릭 시 원래 목록으로 복원
   - 브라우저 뒤로가기(popstate) 대응
===================================================== */

(function () {

    const boardSection = document.querySelector('.board-section');
    if (!boardSection) return;

    // -----------------------------------------------------------------
    // ⚠️ 중요: 상세 페이지에서 "본문 콘텐츠"가 들어있는 영역을 찾기 위한
    // 후보 셀렉터 목록입니다. 카페24 스킨/게시판 설정에 따라 실제 상세
    // 페이지의 구조가 다를 수 있습니다.
    //
    // 적용 후 게시글을 클릭했을 때 레이아웃이 깨지거나(헤더/푸터가 같이
    // 딸려오거나) 본문이 안 보인다면:
    //   1) 실제 게시글 상세 페이지를 새 탭에서 열고
    //   2) 개발자도구(F12) → 본문을 감싸는 가장 가까운 요소를 찾아
    //   3) 그 요소의 id 또는 class를 아래 배열 맨 앞에 추가해주세요.
    // -----------------------------------------------------------------
    const DETAIL_CONTENT_SELECTORS = [
        '.detail .fr-view-article',  // 실제 본문 (Froala 에디터로 작성된 게시글 내용)
        '.fr-view-article',
        '.detail',
        '#contents',
        '#boardArticle',
        '.xans-board-detail',
        '.ec-base-boardview',
        '.ec-base-boardView',
        'article',
        'body'
    ];

    // -----------------------------------------------------------------
    // ⚠️ 위에서 찾아낸 영역 안에서도, "게시판 공통 제목/설명"이나
    // "게시글 수정용 입력폼"처럼 실제 본문이 아닌 요소들이 같이 딸려오는
    // 경우가 있습니다. 아래 배열에 걸리는 요소는 통째로 제거됩니다.
    //
    // 현재 스킨의 firmware.css에 이미 ".titleArea .title h2" 선택자가
    // 존재하는 것으로 보아, 게시판 제목+설명은 ".titleArea"로 감싸져
    // 있을 가능성이 높아 기본으로 포함해두었습니다.
    //
    // 만약 적용 후에도 제목/설명이나 수정 폼이 남아있다면, 실제 게시글
    // 상세 페이지에서 F12로 그 부분을 감싸는 요소의 class/id를 확인해서
    // 아래 배열에 추가해주세요.
    // -----------------------------------------------------------------
    const REMOVE_SELECTORS = [
        '.titleArea',            // 게시판 공통 제목 + 설명 영역
        '[module*="Modify"]',    // 게시글 수정 모듈
        '[module*="modify"]',
        '[module*="CommentWrite"]', // 댓글 작성 모듈
        '.board-back-bar'        // (안전장치) 뒤로가기 버튼이 본문에 섞여 있을 경우
    ];

    // "수정 / 확인 / 취소" 등 게시글 관리용 버튼 텍스트 — form 밖에 있을 경우 대비
    const REMOVE_BUTTON_TEXTS = ['수정', '확인', '취소', '삭제', '답변', '답글'];

    const QUERY_PARAM = 'board_view'; // 상세글 딥링크용 쿼리파라미터 이름

    function stripQueryParam(href) {
        const u = new URL(href, window.location.origin);
        u.searchParams.delete(QUERY_PARAM);
        return u.toString();
    }

    function buildDetailShareURL(detailUrl) {
        const u = new URL(originalListURL, window.location.origin);
        u.searchParams.set(QUERY_PARAM, detailUrl);
        return u.toString();
    }

    const originalListHTML = boardSection.innerHTML;        // 최초 목록 상태 캐시
    const originalListURL = stripQueryParam(window.location.href); // 목록의 "순수" URL (쿼리파라미터 제외)
    const initialDetailURL = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    let isLoading = false;

    function pickDetailElement(doc) {
        for (const sel of DETAIL_CONTENT_SELECTORS) {
            const el = doc.querySelector(sel);
            if (el && el.textContent.trim().length > 0) {
                return el;
            }
        }
        return doc.body;
    }

    function isModifyButton(btn) {
        const txt = (btn.textContent || btn.value || '').trim();
        return REMOVE_BUTTON_TEXTS.indexOf(txt) !== -1;
    }

    function sanitizeDetailElement(el) {
        // 1) 명시적으로 지정한 선택자 제거 (제목/설명 영역, 수정 모듈 등)
        REMOVE_SELECTORS.forEach(function (sel) {
            el.querySelectorAll(sel).forEach(function (node) {
                node.remove();
            });
        });

        // 2) <form> 은 통째로 지우지 않고, "비밀번호 입력창"이나 "수정/확인/취소
        //    같은 버튼"을 포함하고 있는 form만 골라서 제거합니다.
        //    (본문 전체가 form 하나로 감싸져 있는 카페24 게시판 구조 대응)
        el.querySelectorAll('form').forEach(function (form) {
            const hasPassword = !!form.querySelector('input[type="password"]');
            const hasModifyBtn = Array.prototype.some.call(
                form.querySelectorAll('button, a, input[type="button"], input[type="submit"]'),
                isModifyButton
            );
            if (hasPassword || hasModifyBtn) {
                form.remove();
            }
        });

        // 3) form 밖에 비밀번호 입력창이 단독으로 남아있는 경우, 그 블록만 제거
        el.querySelectorAll('input[type="password"]').forEach(function (input) {
            const block = input.closest('div, p, li, section, tr') || input;
            block.remove();
        });

        // 4) "수정/확인/취소" 등 관리용 버튼이 form 밖에 단독으로 남아있는 경우 제거
        el.querySelectorAll('button, a, input[type="button"], input[type="submit"]').forEach(function (btn) {
            if (isModifyButton(btn)) {
                const block = btn.closest('div, p, li') || btn;
                block.remove();
            }
        });

        return el;
    }

    function pickDetailContent(doc) {
        const raw = pickDetailElement(doc);
        const clone = raw.cloneNode(true);
        sanitizeDetailElement(clone);
        return clone.innerHTML.trim();
    }

    function buildBackBar() {
        const bar = document.createElement('div');
        bar.className = 'board-back-bar';
        bar.innerHTML =
            '<button type="button" class="btn-back-to-list">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M15.9992 21.3079L6.69141 12.0001L15.9992 2.69238L17.0627 3.75588L8.81841 12.0001L17.0627 20.2444L15.9992 21.3079Z" fill="#1C1B1F"/>' +
                '</svg>' +
                '목록으로' +
            '</button>';
        return bar;
    }

    function showLoading() {
        boardSection.classList.add('is-loading');
    }

    function hideLoading() {
        boardSection.classList.remove('is-loading');
    }

    function scrollWindowToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function restoreList(historyMode) {
        boardSection.innerHTML = originalListHTML;
        if (historyMode === 'push') {
            history.pushState({ boardAjax: true, type: 'list' }, '', originalListURL);
        } else if (historyMode === 'replace') {
            history.replaceState({ boardAjax: true, type: 'list' }, '', originalListURL);
        }
        scrollWindowToTop();
    }

    function loadDetail(url, historyMode) {
        if (isLoading) return;
        isLoading = true;
        showLoading();

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('요청 실패: ' + res.status);
                return res.text();
            })
            .then(function (html) {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const contentHTML = pickDetailContent(doc);

                boardSection.innerHTML = '';
                boardSection.appendChild(buildBackBar());

                const wrap = document.createElement('div');
                wrap.className = 'board-detail-content';
                wrap.innerHTML = contentHTML;
                boardSection.appendChild(wrap);

                // 상세페이지 안에 원래 있던 "목록/리스트" 버튼도 우리 back 버튼처럼 동작하도록 연결
                wrap.querySelectorAll('a, button').forEach(function (el) {
                    const txt = (el.textContent || '').trim();
                    if (txt === '목록' || txt === '목록으로' || txt === '리스트' || txt === 'List') {
                        el.addEventListener('click', function (e) {
                            e.preventDefault();
                            restoreList('push');
                        });
                    }
                });

                // 주소창은 항상 firmware.html(목록 페이지) 주소를 유지하고,
                // 어떤 게시글을 보고 있는지는 ?board_view= 쿼리파라미터로만 표시합니다.
                // → 새로고침해도 카페24 기본 뷰 템플릿이 아니라 이 커스텀 레이아웃이 그대로 유지됩니다.
                if (historyMode === 'push') {
                    history.pushState({ boardAjax: true, type: 'detail', url: url }, '', buildDetailShareURL(url));
                } else if (historyMode === 'replace') {
                    history.replaceState({ boardAjax: true, type: 'detail', url: url }, '', buildDetailShareURL(url));
                }
                scrollWindowToTop();
            })
            .catch(function () {
                // AJAX 로딩 실패 시 안전하게 일반 페이지 이동으로 폴백
                window.location.href = url;
            })
            .finally(function () {
                isLoading = false;
                hideLoading();
            });
    }

    // 페이지가 ?board_view=... 상태로 로드된 경우(새로고침, 딥링크 등) 자동으로 해당 게시글을 불러옴
    if (initialDetailURL) {
        history.replaceState({ boardAjax: true, type: 'detail', url: initialDetailURL }, '', window.location.href);
        loadDetail(initialDetailURL, 'none');
    } else {
        history.replaceState({ boardAjax: true, type: 'list' }, '', originalListURL);
    }

    // 게시글 제목 클릭 → 상세 AJAX 로딩
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.board-section td.subject a');
        if (!link) return;
        if (link.target === '_blank') return;
        if (!link.href || link.href.indexOf('javascript:') === 0) return;

        e.preventDefault();
        loadDetail(link.href, 'push');
    });

    // "목록으로" 버튼 클릭 → 원래 목록으로 복원
    document.addEventListener('click', function (e) {
        const backBtn = e.target.closest('.btn-back-to-list');
        if (!backBtn) return;
        e.preventDefault();
        restoreList('push');
    });

    // 브라우저 뒤로가기 / 앞으로가기 대응
    window.addEventListener('popstate', function (e) {
        const state = e.state;
        if (!state || !state.boardAjax) return;

        if (state.type === 'list') {
            restoreList('none');
        } else if (state.type === 'detail' && state.url) {
            loadDetail(state.url, 'none');
        }
    });

})();
