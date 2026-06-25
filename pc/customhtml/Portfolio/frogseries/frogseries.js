var frogSwiper = new Swiper(`.frog-swiper`, {
    slidesPerView: 2,
    spaceBetween: 10,
    breakpoints: {
        // 1024px 이상 → 2장씩
        1024: {
            slidesPerView: 4,
            spaceBetween: 30,
            slidesPerGroup: 2,
        }
    },
    pagination:{
    	el: `.swiper-pagination`
    },
});