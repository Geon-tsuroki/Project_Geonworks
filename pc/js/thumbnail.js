var prdImgSwiper = new Swiper (`.inner-swiper`, {
    	slidesPerView: `auto`,
        spaceBetween: 10,
        navigation: {
        nextEl: ".thumb-next",
        prevEl: ".thumb-prev",
      },
        releaseOnEdges: true,
    })
    
    const thumbnailBtnNext = document.querySelector(`.thumb-next`)
    const thumbnailBtnPrev = document.querySelector(`.thumb-prev`)