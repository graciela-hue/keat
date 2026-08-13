if (!customElements.get('reviews-video-slider')) {
  class reviewsVideoSlider extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.initSlider();
      this.initVideoControls();
    }

    initSlider() {
      const slider = this.querySelector('.section-reviews-video-slider-swiper');

      if (!slider) return;

      this.swiper = new Swiper(slider, {
        slidesPerView: 2,
        spaceBetween: 16,
        loop: true,
        pagination: {
            el: this.querySelector('.swiper-pagination'),
            clickable: true,
        },
        breakpoints: {
          768: {
            slidesPerView: 3,
            spaceBetween: 25,
            loop: false
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 25,
          },
          1200: {
            slidesPerView: 5,
            spaceBetween: 40,
          }
        }
      });
    }

    initVideoControls() {
      const videos = this.querySelectorAll('.slider-video');
      const playButtons = this.querySelectorAll('.video-play-btn_wrap');

      videos.forEach((video, index) => {

        const source = video.querySelector('source');

        if (source.dataset.src) {
          source.src = source.dataset.src;
          video.load();
        }

        video.addEventListener('click', () => {
          this.handleVideo(video, index);
        });

        if (playButtons[index]) {
          playButtons[index].addEventListener('click', () => {
            this.handleVideo(video, index);
          });
        }

        video.addEventListener('play', () => {
          if (playButtons[index]) {
            playButtons[index].style.opacity = '0';
          }
        });

        video.addEventListener('pause', () => {
          if (playButtons[index]) {
            playButtons[index].style.opacity = '1';
          }
        });
      });
    }

    handleVideo(currentVideo, currentIndex) {

      const videos = this.querySelectorAll('.slider-video');

      videos.forEach((video, index) => {

        if (index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
          video.muted = true;
        }

      });

      if (currentVideo.paused) {
        currentVideo.muted = false;
        currentVideo.play();
      } else {
        currentVideo.pause();
      }
    }
  }

  customElements.define('reviews-video-slider', reviewsVideoSlider);
}