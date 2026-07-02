/* ===========================
   BULLET LABELS
   슬라이드 18장 → 2장씩 묶음 → 데스크톱 bullet 9개
=========================== */
 
const DESKTOP_LABELS = [
    'COMPONENTS',
    'PCB TEST',
    'STABILIZER',
    'FOAM',
    'PLATE AND SWITCH',
    'HOUSING',
    'KEYCAP AND FINISH'
];
 
/* ===========================
   HELPERS
=========================== */
 
function isMobile() {
    // Swiper breakpoint 기준(1024)과 동일하게 맞춤
    return window.innerWidth < 1024;
}
 
/**
 * bullet DOM이 새로 생성된 직후 텍스트를 적용한다.
 * - 모바일: 1, 2, 3 … (슬라이드 수만큼)
 * - 데스크톱: DESKTOP_LABELS 배열
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
        /**
         * paginationRender: Swiper가 pagination bullet DOM을 (재)생성할 때마다 호출
         * → breakpoint 전환(모바일 ↔ 데스크톱) 시 자동으로 실행되므로
         *   별도 window resize 리스너 불필요
         */
        paginationRender: function () {
            applyBulletLabels();
        },
 
        // bullet 상태(active 등)가 업데이트될 때도 텍스트 보정
        paginationUpdate: function () {
            applyBulletLabels();
        }
    }
});