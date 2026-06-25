(function () {
    'use strict';

    function buildCategoryList() {
        var select   = document.querySelector('.boardSort select');
        var list     = document.getElementById('categoryList');

        // 모듈이 렌더링되지 않았거나 카테고리가 없으면 #manual_category 숨김
        if (!select || !list) {
            var wrap = document.getElementById('manual_category');
            if (wrap) wrap.style.display = 'none';
            return;
        }

        // 현재 활성 카테고리 번호 파악 (URL pathname 또는 querystring 모두 대응)
        // cafe24 URL 형식: /article/portfolio/5/1777/categoryno/2/
        // 또는 ?categoryno=2
        var currentCate = '';

        var pathMatch = window.location.pathname.match(/\/categoryno\/(\d+)/);
        if (pathMatch) {
            currentCate = pathMatch[1];
        } else {
            var params = new URLSearchParams(window.location.search);
            currentCate = params.get('categoryno') || '';
        }

        // 기존 리스트 초기화
        list.innerHTML = '';

        // "전체" 항목 생성
        var allLi = document.createElement('li');
        var allA  = document.createElement('a');

        // 전체 URL: categoryno 제거
        var allUrl = window.location.pathname.replace(/\/categoryno\/\d+\/?/, '/');
        allA.href = allUrl;
        if (!currentCate) allLi.classList.add('active');
        allA.innerHTML = '<span>전체</span>';
        allLi.appendChild(allA);
        list.appendChild(allLi);

        // select option → li 변환
        Array.from(select.options).forEach(function (option) {
            // 값이 없거나 0이면 "카테고리 전체" 옵션이므로 스킵
            if (!option.value || option.value === '0') return;

            var li = document.createElement('li');
            var a  = document.createElement('a');

            // cafe24 카테고리 URL 생성
            // 기존 pathname에 /categoryno/번호/ 를 붙이거나 교체
            var base = window.location.pathname.replace(/\/categoryno\/\d+\/?/, '/');
            // 끝에 슬래시 보장
            if (base.slice(-1) !== '/') base += '/';
            a.href = base + 'categoryno/' + option.value + '/';

            if (option.value === currentCate) {
                li.classList.add('active');
            }

            var span = document.createElement('span');
            span.textContent = option.text;
            a.appendChild(span);
            li.appendChild(a);
            list.appendChild(li);
        });
    }

    // DOM 준비 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildCategoryList);
    } else {
        buildCategoryList();
    }
})();