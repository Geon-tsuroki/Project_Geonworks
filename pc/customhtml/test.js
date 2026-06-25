document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. 기존 readPackage.js 기반 영역 제어 (jQuery)
    // ==========================================
    // replyArea_로 시작하는 모든 엘리먼트를 초기 숨김 처리합니다.
    if (typeof $ !== 'undefined') {
        $('[id^="replyArea_"]').each(function() {
            $(this).hide();
        });
    }

    // ==========================================
    // 2. Swiper 카테고리 데이터 분배 및 초기화 (Vanilla JS)
    // ==========================================
    const dataRows = document.querySelectorAll('#boardDataBridge .data-row');
    const target1 = document.querySelector('.category-target-1');
    const target2 = document.querySelector('.category-target-2');

    // ⭐ 실제 쇼핑몰 관리자에 등록하신 카테고리명으로 매칭해 주세요.
    const categoryName1 = "케이스"; 
    const categoryName2 = "PCB"; 

    let countCat1 = 0;
    let countCat2 = 0;

    // 데이터 분배 루프
    if (dataRows.length > 0) {
        dataRows.forEach(function(row) {
            const currentCategory = row.getAttribute('data-category');
            const trimmedCategory = currentCategory ? currentCategory.trim() : "";

            if (trimmedCategory === categoryName1) {
                if (target1) target1.appendChild(row.cloneNode(true));
                countCat1++;
            } else if (trimmedCategory === categoryName2) {
                if (target2) target2.appendChild(row.cloneNode(true));
                countCat2++;
            }
        });
    }

    // 데이터가 존재하지 않을 때의 예외 예방 문구 출력
    if (countCat1 === 0 && target1) {
        target1.innerHTML = '<tr><td colspan="6" class="message">등록된 게시글이 없습니다.</td></tr>';
    }
    if (countCat2 === 0 && target2) {
        target2.innerHTML = '<tr><td colspan="6" class="message">등록된 게시글이 없습니다.</td></tr>';
    }

    // Swiper 인스턴스 실행
    const faqSwiper = new Swiper('#faq', {
        slidesPerView: 1,
        autoHeight: true, // 내용물 높이에 맞게 슬라이드 영역 가변 조절
        pagination: {
            el: '.faq-pagination',
            clickable: true,
            renderBullet: function (index, className) {
                const menuNames = [categoryName1, categoryName2];
                return '<span class="' + className + '">' + menuNames[index] + '</span>';
            },
        },
    });
});