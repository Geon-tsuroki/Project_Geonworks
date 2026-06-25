jQuery(document).ready(function() {
    
    // ... (기존에 있던 배너 닫기, 멀티샵 숨김, top_category() 등 다른 코드들 유지) ...

    /* ===================================================================
       모바일 사이드 메뉴(Aside) 부드러운 슬라이드 토글 로직 (0.3초)
    =================================================================== */
    // 1. 하위 카테고리가 없는 메뉴 처리
    jQuery('#slide_add_category li').each(function(){
        if( jQuery(this).children('ul').length === 0 ){
            jQuery(this).addClass('noChild');
        } else {
            // 하위 메뉴가 있다면 '+' 버튼(상품보기) 추가
            if(jQuery(this).children('a.cate').length === 0) {
                jQuery(this).append('<a href="#none" class="cate">상품보기</a>');
            }
        }
    });

  // 2. 슬라이드 애니메이션 제어 함수 (CSS 충돌 방지 처리 완료)
    function handleCategoryToggle($li) {
        // 이미 열려있는 형제 카테고리 닫기
        var $siblings = $li.siblings('.selected');
        if ($siblings.length > 0) {
            $siblings.removeClass('selected'); // 1. 클래스 제거 (+버튼으로 즉시 변경)
            // 2. CSS가 숨기기 전에 강제로 노출(.show())시킨 후 0.3초간 닫기
            $siblings.children('ul').show().stop(true, true).slideUp(300); 
        }

        // 클릭한 카테고리 열기/닫기
        if ($li.hasClass('selected')) {
            $li.removeClass('selected'); // 클래스 제거
            $li.children('ul').show().stop(true, true).slideUp(300); // 강제 노출 후 닫기
        } else {
            $li.addClass('selected'); // 클래스 추가 (-버튼으로 즉시 변경)
            // CSS가 억지로 열기 전에 강제로 숨긴(.hide()) 후 0.3초간 열기
            $li.children('ul').hide().stop(true, true).slideDown(300); 
        }
    }

    // 3. 카테고리 텍스트(.view) 및 버튼(.cate) 클릭 이벤트 바인딩
    jQuery('#aside #slide_add_category').on('click', 'a.view', function(e) {
        var $li = jQuery(this).closest('li');
        if ($li.hasClass('noChild')) return; // 하위 메뉴 없으면 페이지 이동 허용
        e.preventDefault();
        handleCategoryToggle($li);
    });

    jQuery('#aside #slide_add_category').on('click', 'a.cate', function(e) {
        e.preventDefault();
        handleCategoryToggle(jQuery(this).closest('li'));
    });

  // 4. 고객센터(게시판) 영역 슬라이드 토글
    jQuery('#aside .navigation-menu__board .title').on('click', function() {
        var $title = jQuery(this);
        var $list = $title.siblings('.categoryList');
        
        if ($title.hasClass('selected')) {
            $title.removeClass('selected');
            $list.show().stop(true, true).slideUp(300);
        } else {
            $title.addClass('selected');
            $list.hide().stop(true, true).slideDown(300);
        }
    });

});