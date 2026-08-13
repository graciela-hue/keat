class ProductListSlider extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initSwiper();
  }

  initSwiper() {
    const slider = this.querySelector('.product-list-slider');

    if (!slider || slider.classList.contains('swiper-initialized')) return;

    new Swiper(slider, {
        slidesPerView: 2,
        spaceBetween: 16,
        navigation: {
          nextEl: slider.querySelector('.swiper-button-next'),
          prevEl: slider.querySelector('.swiper-button-prev'),
        },
        pagination: {
          el: slider.querySelector('.swiper-pagination'),
          clickable: true,
        },

        breakpoints: {
          0: { slidesPerView: 2,spaceBetween: 8},
          768: { slidesPerView: 2.3,spaceBetween: 16 },
          820: { slidesPerView: 3 },
          990: { slidesPerView: 4 },
          1200: { slidesPerView: 4.2 }
        }
    });
  }
}

customElements.define('product-list-slider', ProductListSlider);