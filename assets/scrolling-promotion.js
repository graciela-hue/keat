if (!customElements.get("scrolling-promotion")) {
    class ScrollingPromotion extends HTMLElement {
        constructor() {
            super();

            this.config = {
                moveTime: parseFloat(this.dataset.speed), // 100px going to move for
                space: 100, // 100px
            };

            this.promotion = this.querySelector('.promotion');
            this.init();
        }

        init() {
            if (this.childElementCount === 1) {
                this.promotion.classList.add('promotion--animated');

                for (let index = 0; index < 10; index++) {
                    this.clone = this.promotion.cloneNode(true);
                    this.clone.setAttribute('aria-hidden', true);
                    this.appendChild(this.clone);

                    const imageWrapper = this.clone.querySelector('.media-wrapper');
                    if (imageWrapper) {
                        imageWrapper.classList.remove('loading');
                    }
                }

                const animationTimeFrame = (this.promotion.clientWidth / this.config.space) * this.config.moveTime;
                this.style.setProperty('--duration', `${animationTimeFrame}s`);

                // pause when out of view
                const observer = new IntersectionObserver((entries, _observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.scrollingPlay();
                        } else {
                            this.scrollingPause();
                        }
                    });
                }, { rootMargin: '0px 0px 50px 0px' });

                observer.observe(this);
            }
        }

        scrollingPlay() {
            this.classList.remove('scrolling-promotion--paused');
        }

        scrollingPause() {
            this.classList.add('scrolling-promotion--paused');
        }
    }

    window.ScrollingPromotion = ScrollingPromotion;

    customElements.define("scrolling-promotion", ScrollingPromotion);
}