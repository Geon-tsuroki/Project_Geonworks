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
