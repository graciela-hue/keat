class MultiCollectionsTabs extends HTMLElement {
  constructor() {
    super();
    this.swipers = [];
  }

  connectedCallback() {
    this.tabs = this.querySelectorAll('.multi-collections-tabs__tab');
    this.panels = this.querySelectorAll('.multi-collections-tabs__panel');
    this.subtitle = this.querySelector('.js-tab-subtitle');

    this.initTabs();
    this.initSwiper();
    this.initReadMore();

  }
  disconnectedCallback() {
    this.swipers.forEach(swiper => swiper.destroy());
    this.swipers = [];
  }
  initTabs() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {

        const target = tab.dataset.tab;

        this.tabs.forEach((item) => {
          item.classList.remove('is-active');
        });

        this.panels.forEach((panel) => {
          panel.classList.remove('is-active');
        });

        tab.classList.add('is-active');

        const activePanel = this.querySelector(
          `[data-panel="${target}"]`
        );

        if (activePanel) {
          activePanel.classList.add('is-active');
        }

        if (this.subtitle) {
          this.subtitle.innerHTML = tab.dataset.subtitle;
        }
        const activeSwiperEl = this.querySelector('.multi-collections-tabs__panel.is-active .multi-collections-tabs-products-slider');
        if (activeSwiperEl && activeSwiperEl.swiper) {
          activeSwiperEl.swiper.update();
        }
      });
    });
  }

  initReadMore() {
    const mobileBreakpoint = 767;

    this.querySelectorAll('.multi-collections-tabs__content-card').forEach(card => {
      const content = card.querySelector('.js-card-content');
      const button = card.querySelector('.js-card-toggle');

      if (!content || !button) return;

      const checkHeight = () => {
        if (window.innerWidth > mobileBreakpoint) {
          button.style.display = 'none';
          card.classList.remove('is-expanded');
          return;
        }

        if (content.scrollHeight <= 180) {
          button.style.display = 'none';
        } else {
          button.style.display = 'flex';
        }
      };

      checkHeight();
      window.addEventListener('resize', checkHeight);

      button.addEventListener('click', () => {
        card.classList.toggle('is-expanded');

        const expanded = card.classList.contains('is-expanded');

        button.querySelector('span').textContent =
          expanded ? 'Ver menos' : 'Ver más';
      });
    });
  }

  initSwiper() {
     this.querySelectorAll('.multi-collections-tabs-products-slider').forEach(sliderEl => {
      const swiper = new Swiper(sliderEl, {
        slidesPerView: 2,
        spaceBetween: 16,
        navigation: {
          nextEl: sliderEl.querySelector('.swiper-button-next'),
          prevEl: sliderEl.querySelector('.swiper-button-prev'),
        },
        pagination: {
          el: sliderEl.querySelector('.swiper-pagination'),
          clickable: true,
        },

        breakpoints: {
          0: { slidesPerView: 2,spaceBetween: 8 },
          768: { slidesPerView: 1.3,spaceBetween: 16 },
          820: { slidesPerView: 2 },
          990: { slidesPerView: 2.2 },
          1200: { slidesPerView: 3.1 }
        }
      });
      this.swipers.push(swiper);
    });


  }
}

customElements.define('multi-collections-tabs',  MultiCollectionsTabs);