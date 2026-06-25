	var swiper = new Swiper("#main-banner", {
        pagination: {
        el: ".swiper-pagination",
        dynamicBullets: true,
      },
        navigation: {
        nextEl: ".banner-next",
        prevEl: ".banner-prev",
      },
        autoplay: {
       delay: 5000,
     },
    });