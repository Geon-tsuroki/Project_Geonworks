const originalSwiper = new Swiper ('.swiper', {
	slidesPerView : 2,
    spaceBetween: 30,
    breakpoints: {
        // 화면 너비가 1024px 이상일 때 (PC 데스크탑)
        1025: {
            slidesPerView: 4,
            spaceBetween: 50,
        }
    },
})