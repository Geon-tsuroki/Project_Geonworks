var colSwiper = new Swiper(".colswiper", {
    slidesPerView: 4,
    centeredSlides: false,
    slidesPerGroup:4,
    spaceBetween: 30,
      pagination: {
          el: ".col-swiper-pagination",
          clickable: false,
      },
    breakpoints: {
    767: {
      slidesPerView: 2,
      spaceBetween: 20,
      slidesPerGroup:2,
    }}
});