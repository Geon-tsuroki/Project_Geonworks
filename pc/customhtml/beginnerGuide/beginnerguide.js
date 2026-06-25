/* ===========================
   BULLET LABELS
=========================== */

// 데스크톱: 슬라이드 2장씩 묶으므로 bullet 5개
const DESKTOP_LABELS = [
    'ABOUT KEYBOARD',
    'HOUSING AND WEIGHT',
    'PCB AND PLATE',
    'STABILIZER',
    'SWITCH AND KEYCAP'
];

// 모바일: 슬라이드 1장씩, bullet = 슬라이드 수 → 숫자로 표시
// (숫자는 paginationRender 콜백에서 인덱스+1 로 자동 생성)

/* ===========================
   HELPERS
=========================== */

function isMobile() {
    return window.innerWidth < 1024;
}

/**
 * bullet 요소에 텍스트를 적용한다.
 * 모바일이면 1,2,3… 숫자, 데스크톱이면 DESKTOP_LABELS 배열.
 */
function applyBulletLabels() {
    const bullets = document.querySelectorAll('.guide-pagination .swiper-pagination-bullet');

    if (isMobile()) {
        bullets.forEach((bullet, i) => {
            bullet.innerText = String(i + 1);
        });
    } else {
        bullets.forEach((bullet, i) => {
            if (DESKTOP_LABELS[i] !== undefined) {
                bullet.innerText = DESKTOP_LABELS[i];
            }
        });
    }
}

/* ===========================
   SWIPER INIT
=========================== */

const beginnerSwiper = new Swiper('#beginner_guide', {
    slidesPerView: 1,
    spaceBetween: 0,
    slidesPerGroup: 1,

    pagination: {
        el: '.guide-pagination',
        clickable: true,
    },

    breakpoints: {
        // 1024px 이상 → 2장씩
        1024: {
            slidesPerView: 2,
            spaceBetween: 0,
            slidesPerGroup: 2,
        }
    },

    on: {
        // Swiper가 pagination을 (재)렌더링할 때마다 실행
        // → breakpoint 전환(모바일↔데스크톱) 시 자동으로 호출됨
        paginationRender: function () {
            applyBulletLabels();
        },

        // 슬라이드 전환 시에도 혹시 bullet이 재생성되면 재적용
        paginationUpdate: function () {
            applyBulletLabels();
        }
    }
});
