class ComparisonTable extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initSwiper();
  }

  initSwiper() {
    const slider = this.querySelector('.comparison-swiper');

    if (!slider || slider.classList.contains('swiper-initialized')) return;

    new Swiper(slider, {
      slidesPerView: 1.38,
      pagination: {
        el: '.swiper-pagination',
        clickable: true
      },
      breakpoints: {
        768: {
          slidesPerView: 2
        },
      }
    });
  }
}

customElements.define('comparison-table', ComparisonTable);