var frogSwiper = new Swiper(`.frog-swiper`, {
    slidesPerView: 2,
    spaceBetween: 10,
    breakpoints: {
        1024: {
            slidesPerView: 4,
            spaceBetween: 30,
        }
    },
});