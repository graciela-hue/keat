function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}


function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);

    if(this.mainDetailsToggle.classList.contains('mobile-facets__disclosure')){
      document.body.classList.add('facet-open');
      const mobileFacetsInner = document.querySelector('.mobile-facets__inner');
      const productGrid = document.getElementById('ProductGridContainer');
      if (mobileFacetsInner && productGrid) {
        productGrid.style.minHeight = `${mobileFacetsInner.offsetHeight}px`;
      }
    }
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if(this.mainDetailsToggle.classList.contains('mobile-facets__disclosure')){
      document.body.classList.remove('facet-open');
    }

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    this.dataset.section = this.closest('.shopify-section').id.replace('shopify-section-', '');
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class BulkModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      if (this.innerHTML.trim() === '') {
        const productUrl = this.dataset.url.split('?')[0];
        fetch(`${productUrl}?section_id=bulk-quick-order-list`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const sourceQty = html.querySelector('.quick-order-list-container').parentNode;
            this.innerHTML = sourceQty.innerHTML;
          })
          .catch((e) => {
            console.error(e);
          });
      }
    };

    new IntersectionObserver(handleIntersection.bind(this)).observe(
      document.querySelector(`#QuickBulk-${this.dataset.productId}-${this.dataset.sectionId}`)
    );
  }
}

customElements.define('bulk-modal', BulkModal);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }

      // Workaround for safari iframe bug
      const formerStyle = deferredElement.getAttribute('style');
      deferredElement.setAttribute('style', 'display: block;');
      window.setTimeout(() => {
        deferredElement.setAttribute('style', formerStyle);
      }, 0);
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true }
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked ? this.pause() : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (!this.reducedMotion.matches && !this.announcementBarArrowButtonWasClicked) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeRecommendations(this.dataset.productId);
  }

  initializeRecommendations(productId) {
    this.observer?.unobserve(this);
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);
        this.loadRecommendations(productId);
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    this.observer.observe(this);
  }

  loadRecommendations(productId) {
    fetch(`${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations?.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }

        if (!this.querySelector('.complementary-products-wrap') && this.classList.contains('complementary-products')) {
          this.remove();
        }

        if (html.querySelector('.grid__item')) {
          this.classList.add('product-recommendations--loaded');
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

class BulkAdd extends HTMLElement {
  static ASYNC_REQUEST_DELAY = 250;

  constructor() {
    super();
    this.queue = [];
    this.setRequestStarted(false);
    this.ids = [];
  }

  startQueue(id, quantity) {
    this.queue.push({ id, quantity });

    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue);
        }
      } else {
        clearInterval(interval);
      }
    }, BulkAdd.ASYNC_REQUEST_DELAY);
  }

  sendRequest(queue) {
    this.setRequestStarted(true);
    const items = {};

    queue.forEach((queueItem) => {
      items[parseInt(queueItem.id)] = queueItem.quantity;
    });
    this.queue = this.queue.filter((queueElement) => !queue.includes(queueElement));

    this.updateMultipleQty(items);
  }

  setRequestStarted(requestStarted) {
    this._requestStarted = requestStarted;
  }

  get requestStarted() {
    return this._requestStarted;
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;

    if (inputValue < event.target.dataset.min) {
      this.setValidity(event, index, window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min));
    } else if (inputValue > parseInt(event.target.max)) {
      this.setValidity(event, index, window.quickOrderListStrings.max_error.replace('[max]', event.target.max));
    } else if (inputValue % parseInt(event.target.step) != 0) {
      this.setValidity(event, index, window.quickOrderListStrings.step_error.replace('[step]', event.target.step));
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      event.target.setAttribute('value', inputValue);
      this.startQueue(index, inputValue);
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
}

if (!customElements.get('bulk-add')) {
  customElements.define('bulk-add', BulkAdd);
}

class CartPerformance {
  static #metric_prefix = "cart-performance"

  static createStartingMarker(benchmarkName) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    return performance.mark(`${metricName}:start`);
  }

  static measureFromEvent(benchmarkName, event) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`, {
      startTime: event.timeStamp
    });

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }

  static measureFromMarker(benchmarkName, startMarker) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      startMarker.name,
      `${metricName}:end`
    );
  }

  static measure(benchmarkName, callback) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`);

    callback();

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }
}



// Custom Js

class FeaturedBlogSlider extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initSwiper();
  }

  initSwiper() {
    const slider = this.querySelector('.featured-blog-slider');

    if (!slider || slider.classList.contains('swiper-initialized')) return;

    new Swiper(slider, {
        slidesPerView: 1,
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
          0: { slidesPerView: 1,spaceBetween: 16,},
          768: { slidesPerView: 2,spaceBetween: 16 },
          990: { slidesPerView: 3,spaceBetween: 24 },
        }
    });
  }
}

customElements.define('featured-blog', FeaturedBlogSlider);


class HealthSupport extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initSwiper();
  }

  initSwiper() {
    const slider = this.querySelector('.health-support-slider');

    if (!slider || slider.classList.contains('swiper-initialized')) return;

    new Swiper(slider, {
        slidesPerView: 2,
        spaceBetween: 8,
        breakpoints: {
          768: { slidesPerView: 3,spaceBetween: 16 },
          990: { slidesPerView: 4,spaceBetween: 24 },
        }
    });
  }
}

customElements.define('health-support', HealthSupport);

$(document).ready(function(){

  // ------------  collapsible-content
    if($('.collapsible-content .collapsible-content-tab').length > 0){
      $('.collapsible-content-tabs-toggle').click(function(e){
        e.preventDefault();
        $(this).addClass('is_active').siblings('.collapsible-content-tabs-toggle').removeClass('is_active');
        var tab = $(this).data('tab');
        $('.collapsible-content-tab[data-tab-for="'+ tab +'"]').show().siblings('.collapsible-content-tab').hide();
      });

      $('.collapsible-content .collapsible-block .collapsible-block-toggle').click(function(){
        $(this).next('.collapsible-block-content').slideToggle();
        $(this).parents('.collapsible-block').toggleClass('active');
      });
    }
    // ------------  collapsible-content


    // ------------  Product Page
    // Media gallery
    if($('.main-product').length > 0){
        window.product_main_thumb = new Swiper('.main-product #product__main-media-thumb',{
            slidesPerView: 'auto',
            direction: 'vertical',
            spaceBetween: 8,
            watchSlidesProgress: true,
            centeredSlides: false,
            slideToClickedSlide: true,
            mousewheel: {
                forceToAxis: true
            },
            navigation: {
                nextEl: '.main-product .product__main-media-thumb-wrap .swiper-button-next',
                prevEl: '.main-product .product__main-media-thumb-wrap .swiper-button-prev',
            },
            breakpoints: {
              750: {
                spaceBetween: 8,
              },
              990: {
                  spaceBetween: 14,
              }
            }
        });

        window.product_main_media = new Swiper('.main-product #product__main-media-list',{
            slidesPerView: 1,
            spaceBetween: 12,
            initialSlide: $('.product__main-media-list [data-featured-media]').length > 0 ? $('.product__main-media-list [data-featured-media]').index() : 0,
            mousewheel: {
                forceToAxis: true
            },
            pagination: {
                el: ".main-product #product__main-media-list .swiper-pagination",
                clickable: true,
            },
            thumbs: {
                swiper: product_main_thumb
            }
        });

        if($('.product__accordion').length > 0){
          $('.product__accordion .product__accordion-toggle').click(function(){
            $(this).next('.product__accordion-content').slideToggle();
            $(this).parents('.product__accordion').toggleClass('active');
          });
        }

    }
    // Media gallery

    // Shipping date
    if ($('#product-shpping-date-info').length > 0) {

      function getMexicoDate() {
        const now = new Date();
        const mexicoTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: false,
        }).formatToParts(now);

        const values = {};
        mexicoTime.forEach(part => {
          if (part.type !== "literal") {
            values[part.type] = part.value;
          }
        });

        return new Date(
          values.year,
          values.month - 1,
          values.day,
          values.hour,
          values.minute,
          values.second
        );
      }

      const el = $('#product-shpping-date-info');
      var now = getMexicoDate();
      const cutoff = el.data("cutoff");
      const shippingBusinessDays = el.data("business-days");
      const shippingLeadTime = parseInt(el.data("lead-time"));

      // SHIPPING BUSINESS DAYS
      function isShippingDay(date) {
        const d = date.getDay() === 0 ? 7 : date.getDay(); // Sun = 7
        return d <= shippingBusinessDays;
      }

      function nextShippingDay(date) {
        const d = new Date(date);
        do {
          d.setDate(d.getDate() + 1);
        } while (!isShippingDay(d));
        return d;
      }

      // DELIVERY DAYS (Mon–Wed)
      function isDeliveryDay(date) {
        const d = date.getDay(); // 1 = Mon, 3 = Wed
        return d >= 1 && d <= 3;
      }

      function nextDeliveryDay(date) {
        const d = new Date(date);
        do {
          d.setDate(d.getDate() + 1);
        } while (!isDeliveryDay(d));
        return d;
      }

      // BASE SHIPPING DATE
      let shippingDate = new Date(now);

      if (cutoff) {
        const [h, m] = cutoff.split(":");
        const cutoffTime = new Date(now);
        cutoffTime.setHours(h, m, 0, 0);

        if (now > cutoffTime) {
          shippingDate = nextShippingDay(shippingDate);
        }
      }

      if (!isShippingDay(shippingDate)) {
        shippingDate = nextShippingDay(shippingDate);
      }

      // APPLY LEAD TIME
      let added = 0;
      while (added < shippingLeadTime) {
        shippingDate = nextShippingDay(shippingDate);
        added++;
      }

      // SHIPPING DAY TEXT
      const today = getMexicoDate();
      const tomorrow = getMexicoDate();
      tomorrow.setDate(today.getDate() + 1);

      function isSameDay(a, b) {
        return a.toDateString() === b.toDateString();
      }
      if (isSameDay(shippingDate, today)) {
        el.find(".shipping_day").text("HOY");
      } else if (isSameDay(shippingDate, tomorrow)) {
        el.find(".shipping_day").text("MAÑANA");
      } else {
        const shippingFormatted = shippingDate
          .toLocaleDateString("es-ES", { weekday: "short", month: "short", day: "numeric" })
          .toUpperCase();
        el.find(".shipping_day").text(shippingFormatted);
      }

      // DELIVERY DATE = SHIPPING DATE + 1 DAY
      let deliveryDate = new Date(shippingDate);
      deliveryDate.setDate(deliveryDate.getDate() + 1); // safe month/year rollover

      const deliveryFormatted = deliveryDate
        .toLocaleDateString("es-ES", { weekday: "short", month: "short", day: "numeric" })
        .toUpperCase();
      el.find(".delivery_day").text(deliveryFormatted);
    }
    // Shipping date


    // subscribe widget
    if ($('#custom-subscription-widget').length > 0) {
      document.addEventListener('sealsubs:price_update', function(e) {
        var subscription_widget_price = e.detail.price,
        subscription_widget_compareAtPrice = e.detail.compareAtPrice;

        if(subscription_widget_price)$('#benefits-and-gift-box .benefits-block .r_price [data-price]').text(Shopify.formatMoney(subscription_widget_price, window.Shopify.money_format));
        (subscription_widget_price < subscription_widget_compareAtPrice)?$('#benefits-and-gift-box .benefits-block .c_price [data-price]').text(Shopify.formatMoney(subscription_widget_compareAtPrice, window.Shopify.money_format)).parent('.c_price').removeClass('hidden'):$('#benefits-block .c_price [data-price]').text('').parent('.c_price').addClass('hidden');
      });

      document.addEventListener('sealsubs:selling_plan_changed', function(e) {
        if($('#custom-subscription-widget [data-sls-selling_plan]').val() != ''){
          $('#custom-subscription-widget #benefits-and-gift-box').removeClass('hidden');
        }else{
          $('#custom-subscription-widget #benefits-and-gift-box').addClass('hidden');
        }
      });
    }

    if ($('#custom-subscription-widget #gift-box-popup-modal .gift-box-slider').length > 0) {
      var gift_box_slider = new Swiper('#gift-box-popup-modal .gift-box-slider',{
          slidesPerView: 2,
          spaceBetween: 16,
          navigation: {
            nextEl: '#gift-box-popup-modal .gift-box-slider .swiper-button-next',
            prevEl: '#gift-box-popup-modal .gift-box-slider .swiper-button-prev',
          },
          pagination: {
            el: '#gift-box-popup-modal .gift-box-slider .swiper-pagination',
            clickable: true,
          },

          breakpoints: {
            0: { slidesPerView: 2,spaceBetween: 16,},
            990: { slidesPerView: 2,spaceBetween: 28 },
          }
      });

      $('#gift-box-popup-modal #gift-box-popup-modal-close, #gift-box-popup-modal .gift-box-popup-modal-overlay').click(function(e){
        e.preventDefault();
        $('#gift-box-popup-modal').removeClass('open_popup');
        $('body').removeClass('overflow-hidden');
      });

      $('#gift-box-popup-btn').click(function(e){
        e.preventDefault();
        $('#gift-box-popup-modal').addClass('open_popup');
        $('body').addClass('overflow-hidden');
      });

    }
    // subscribe widget

    // Program popup
    if ($('#program_contents .program_contents-row .block-media.has_video').length > 0) {

      $('#program_contents-modal #program_contents-modal-close, #program_contents-modal .program_contents-modal-overlay').click(function(e){
        e.preventDefault();
        $('#program_contents-modal').removeClass('open_popup');
        $('#program_contents-modal video')[0].pause();
        $('body').removeClass('overflow-hidden');
      });

      $('#program_contents .program_contents-row .block-media.has_video').click(function(e){
        e.preventDefault();
        var template = $(this).find('.data-video-template')[0];
        if (template) {
            $('#program_contents-modal .program_contents-modal-content').empty().html(template.innerHTML);
            $('#program_contents-modal').addClass('open_popup');
            $('body').addClass('overflow-hidden');
        }
      });

      $(document).on('click', '#program_contents-modal video', function () {
          if (this.paused) {
              this.play();
              $(this).parent('.media-block').addClass('play');
          } else {
              this.pause();
              $(this).parent('.media-block').removeClass('play');
          }
      });
    }
    // Program popup
    

    // variant as checkbox
    if($('#variant_checkbox_wrap').length > 0){
      $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap form').addClass('variants_as_checkbox_form');
      $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap form input[name="id"]').replaceWith('','<div id="input-checkbox-data"></div>');
      $('#variant_checkbox_wrap input[type="checkbox"]:checked').length <= 0 ? $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap .product-form__submit').attr('disabled',true) : $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap .product-form__submit').removeAttr('disabled');

      $('#variant_checkbox_wrap [name="variant_checkbox_item"]').on('change', function () {
        let totalPrice = 0;
        let totalComparePrice = 0;

        const $checked = $('#variant_checkbox_wrap input[type="checkbox"]:checked');

        const portion_contains_min = $checked.length === 0 ? 1 : $checked.length;
        const portion_contains = parseInt($('.portions-blocks #portions-contains').data('contains')) * portion_contains_min;
        const portion_count = parseInt($('.portions-blocks #portions-count').data('portion-count'));

        $checked.each(function () {
          totalPrice += parseFloat($(this).data('price')) || 0;
          totalComparePrice += parseFloat($(this).data('compare-price')) || 0;
        });
        totalPrice = $checked.length <= 0 ? $('#variant_checkbox_wrap').data('default-sell-price'): totalPrice;
        totalComparePrice = $checked.length <= 0 ? $('#variant_checkbox_wrap').data('default-compare-price'): totalComparePrice;

        const inputs = $checked.map(function (index) {
          return `
            <input type="hidden" name="items[${index}][id]" value="${this.value}">
            <input type="hidden" name="items[${index}][quantity]" value="1">
          `;
        }).get().join('');

        const check_label = $checked.map(function (index) {
          return this.dataset.label;
        }).get().join(', ');

        $('#input-checkbox-data').html(inputs);
        $('#variant_checkbox_wrap').parents('product-info').find('.price-wrap .price [data-sell-price]').text(Shopify.formatMoney(totalPrice, window.Shopify.money_format) + ' ' + window.Shopify.currency.active);
        if ($('#variant_checkbox_wrap').parents('product-info').find('.price-wrap .price.price--on-sale').length > 0) {
          $('#variant_checkbox_wrap').parents('product-info').find('.price-wrap .price.price--on-sale [data-compare-price]').text(Shopify.formatMoney(totalComparePrice, window.Shopify.money_format) + ' ' + window.Shopify.currency.active);
          totalComparePrice < totalPrice ? $('#variant_checkbox_wrap').parents('product-info').find('.price-wrap .price.price--on-sale [data-compare-price]').addClass('hidden'):$('#variant_checkbox_wrap').parents('product-info').find('.price-wrap .price.price--on-sale [data-compare-price]').removeClass('hidden');
        }
        $('#variant_checkbox_wrap .variant_checkbox_label .data-value').text(check_label);
        
        const per_portion_price = totalPrice / portion_contains * portion_count;
        $('.portions-blocks #portions-price').text(Shopify.formatMoney(per_portion_price, window.Shopify.money_format));
        $('.portions-blocks #portions-contains').text(portion_contains);

        const info_week_count = $checked.length <= 0 ? 'X' : $checked.last().data('index');
        $('#variant_checkbox_wrap .variant_checkbox_info .block_text .count').text(info_week_count);

        $checked.length <= 0 ? $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap .product-form__submit').attr('disabled',true) : $('#variant_checkbox_wrap').parents('product-info').find('.product-form--wrap .product-form__submit').removeAttr('disabled');
      });
    }
    // variant as checkbox

    // Product Date
    if($('#ProductDateBuilder').length > 0){
      function input_title_val(){
        $('#ProductDateBuilder .product-date-block-inputs').each(function(){
          var check_val = $(this).find('input:checked').val();
          $(this).parents('.product-date-block').find('.product-date-field_label [data-value]').text(check_val);
          $(this).parents('.product-date-block').find('input[type="hidden"]').val(check_val);
        });
      }
      input_title_val();
      $('#ProductDateBuilder .product-date-block-inputs input').on('change',function(){
        input_title_val();
      });

      $(document).on("change", ".product-opt-selecciona-el-numero-de-dias-para-tu-programa input", function () {
        var dias = $(this).val().trim();
        console.log(dias);

        if (dias === "5 días") {
          $("#ProductDateBuilder .group-of-dates input:not([data-day='Monday'])").addClass("hidden");
          $("#ProductDateBuilder .group-of-dates input[data-day='Monday']").eq(0).prop("checked", true);
          input_title_val();
        } else {
          $("#ProductDateBuilder .group-of-dates input:not([data-day='Monday'])").removeClass("hidden");
        }
      });

      if($('.product-opt-selecciona-el-numero-de-dias-para-tu-programa').length > 0){
        if($('.product-opt-selecciona-el-numero-de-dias-para-tu-programa input:checked').val() == "5 días"){
          $("#ProductDateBuilder .group-of-dates input:not([data-day='Monday'])").addClass("hidden");
          $("#ProductDateBuilder .group-of-dates input[data-day='Monday']").eq(0).prop("checked", true);
          input_title_val();
        } else{
          $("#ProductDateBuilder .group-of-dates input:not([data-day='Monday'])").removeClass("hidden");
        }
      }
    }
    // Product Date

    // Product Card quickadd
    if($('.product-card-wrapper .quick-add .quick-add-variant-block').length > 0){
      function closeVariantPopup() {
        $('.quick-add-variant-popup').remove();
        $('.quick-add-variant-btn').removeClass('open_popup');
      }

      $(document).on('click', '.quick-add-variant-btn', function (e) {
        e.stopPropagation();
        const $btn = $(this);
        
        // Default logic (outside Swiper)
        if (!$btn.closest('.swiper-slide').length) {
          const $current = $btn.closest('.quick-add-variant');
          $('.quick-add-variant').not($current).removeClass('is-open');
          $current.toggleClass('is-open');
          return;
        }

        // Swiper logic
        closeVariantPopup();
        
        $btn.addClass('open_popup');
        const $originalBlock = $btn.closest('.quick-add-variant').find('.quick-add-variant-block');
        const $popup = $originalBlock.clone();

        $popup.removeClass('quick-add-variant-block').addClass('quick-add-variant-popup');
        const $originalLabels = $originalBlock.find('label')
        
        $popup.find('label').each(function (index) {
          $(this).attr('data-originalLabel', $originalLabels.eq(index).attr('for'));
        });

        $('body').append($popup);
        const offset = $btn.offset();
        $popup.css({
          position: 'absolute',
          top: offset.top + $btn.outerHeight() + 8,
          left: offset.left,
          width: $originalBlock.outerWidth(),
          zIndex: 99999
        });

      });
      
      $(document).on('click', '.quick-add-variant-popup label', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data('originallabel');
        if(id){
          $('.product-card-wrapper .quick-add .quick-add-variant-block label[for="'+ id +'"]').trigger('click')
        }
        closeVariantPopup();
      });

      $(document).on('click', function () {
        closeVariantPopup();
        $('.quick-add-variant.is-open').removeClass('is-open');
      });

      $(document).on('click', '.quick-add-variant-popup', function (e) {
        e.stopPropagation();
      });

      $(document).on('click','.product-card-wrapper .quick-add .quick-add-variant-block label',function(){
        var el = $(this);
        var totalPrice = $(this).data('price');
        var totalComparePrice = $(this).data('compare-price');
        // $(this).parents('.product-card-wrapper').find('.card__price [data-sell-price]').text(totalPrice);
        // if ($(this).parents('.product-card-wrapper').find('.card__price.price--on-sale').length > 0) {
        //   $(this).parents('.product-card-wrapper').find('.card__price.price--on-sale [data-compare-price]').text(totalComparePrice);
        //   totalComparePrice < totalPrice ? $(this).parents('.product-card-wrapper').find('.card__price.price--on-sale [data-compare-price]').addClass('hidden'):$(this).parents('.product-card-wrapper').find('.card__price.price--on-sale [data-compare-price]').removeClass('hidden');
        // }
        $(this).closest('.quick-add-variant').removeClass('is-open');
        $(this).closest('.quick-add-variant').find('.quick-add-variant-btn').addClass('loading');
        $(this).closest('.quick-add-variant').find('.quick-add-variant-btn .loading__spinner').removeClass('hidden');
        setTimeout(function(){
          el.parents('.quick-add').find('.quick-add__submit').click();
        },200);
      });
    }
    // Product Card quickadd

    // product Bundle
    if($('#product_bundle').length > 0){

      $(document).on('click','#product_bundle .product_bundle_type-toggle',function(e){
        e.preventDefault();
        var data_type = $(this).data('bundle')
        $(this).addClass('active').siblings('.product_bundle_type-toggle').removeClass('active');
        $('#product_bundle').attr('data-bundle-type', data_type);
        if(data_type == 'site-recommended'){
          var qty = parseInt($('#product_bundle').data('qty'));
          $('#product_bundle').parents('product-info').find('.product-form--wrap .product-form__submit').removeAttr('disabled');
          // $('#product_bundle .bundle_product-qty input').val(1);
          // $('#product_bundle input[name="Personalizar-product"]').prop("checked", false);
          $('#properties-combinacion').val('RECOMENDACIÓN KEAT '+ qty);
          $('#product_bundle').removeClass('all_items_added');
        }else{
          $('#properties-combinacion').val();
          $('#product_bundle').parents('product-info').find('.product-form--wrap .product-form__submit').attr('disabled',true);
          // $('#product_bundle .selected-item-count [data-value]').text($('#product_bundle').data('qty'));
          custom_bundle();
        }
        $('#product_bundle .bundle-filter-btn.combiner_filter').click();
      });

      function product_item_saved_qty(){
        $('#product_bundle .bundle_product-block').each(function(){
          console.log($(this).data('item-checked'));
          if($(this).data('item-checked') == 'true' || $(this).data('item-checked') == true){
            // $(this).find('.bundle_product-qty input').val($(this).data('item-qty'));
            console.log($(this).find('input[name="Personalizar-product"]'))
            $(this).find('input[name="Personalizar-product"]').prop("checked", true);
          }
        });
      }

      function custom_bundle(){
        var max_qty = parseInt($('#product_bundle').data('qty'));
        let total_quantity = 0;
        let custom_bundle_arr = [];
        $('#product_bundle input[name="Personalizar-product"]:checked').each(function () {
            var value = $(this).val();
            var qty = parseInt($(this).siblings('.bundle_product-qty').find('input').val()) || 0;
            total_quantity += qty;
            custom_bundle_arr.push(`${qty}x ${value}`);
            $(this).parents('.bundle_product-block').attr('data-item-qty',qty);
        });
        custom_bundle_arr = custom_bundle_arr.join(', ');
        if(max_qty == total_quantity){
          $('#product_bundle').addClass('all_items_added');
          $('#product_bundle .selected-item-count [data-value]').text(max_qty);
          $('#properties-combinacion').val(custom_bundle_arr);
          $('#product_bundle').parents('product-info').find('.product-form--wrap .product-form__submit').removeAttr('disabled');
        }else{
          $('#product_bundle .selected-item-count [data-value]').text(max_qty - total_quantity);
          if($('#product_bundle').hasClass('all_items_added')){$('#product_bundle').removeClass('all_items_added');}
          $('#product_bundle').parents('product-info').find('.product-form--wrap .product-form__submit').attr('disabled',true);
        }
      }

      $(document).on('click','.bundle_product-qty .qty-btn.minus',function(){
        var current = $(this).siblings("input").val();
        if (current > 1) {
          $(this).siblings("input").val(current - 1);
        } else if (current == 1) {
          $(this).parents(".bundle_product-qty").siblings('input[name="Personalizar-product"]').prop("checked", false);
        }
        custom_bundle();
      });

      $(document).on('click','.bundle_product-qty .qty-btn.plus',function(){
        var current = parseInt($(this).siblings("input").val());
        $(this).siblings("input").val(current + 1);
        custom_bundle();
      });

      $(document).on('click','#product_bundle .bundle-filter-btn',function(e){
        e.preventDefault();
        var filter = $(this).data('category')
        $(this).addClass('active').siblings('.bundle-filter-btn').removeClass('active');
        if(filter){
        $('#product_bundle .bundle_product-block[data-category="'+ filter +'"]').removeClass('hidden').siblings('.bundle_product-block:not([data-category="'+ filter +'"])').addClass('hidden');
        }else{
          $('#product_bundle .bundle_product-block').removeClass('hidden')
        }
      });

      $(document).on('change','#product_bundle input[name="Personalizar-product"]',function(e){
        $(this).parents('.bundle_product-block').attr('data-item-checked',$(this).is(':checked'));
        custom_bundle();
      });
    }
    // product Bundle

    // ------------  Product Page

    // ------------ Facets
    if($('.facets-wrapper').length > 0){
      $(document).on('click', '.mobile-facets__details .mobile-facets__toggle' ,function (e) {
        e.preventDefault();
        $(this).parents('.mobile-facets__details').toggleClass('facet_open');
        $(this).next('.mobile-facets__menu').slideToggle();
      });
      
      $(document).on('click', '.sort_by-popup .sort_by-popup-btn' ,function (e) {
        e.preventDefault();
        $(this).parents('.sort_by-popup').toggleClass('active');
      });

      $(document).on('change', '.sort_by-popup input[type=radio]' ,function (e) {
        e.preventDefault();
        $(this).parents('.sort_by-popup').removeClass('active');
      });

      $(document).click(function (e) {
        var sort_popup = $(".sort_by-popup");
        if (!sort_popup.is(e.target) && sort_popup.has(e.target).length === 0) {
          sort_popup.removeClass("active");
        }
      });
    }
    // ------------ Facets


    // ------------ Cart Drawer
    if($('.cart-drawer').length > 0){
      $(document).on('click', '.cart-drawer .cart-item .cart-subscription .cart-subscription-toggle' ,function (e) {
        $(this).parent('.cart-subscription').toggleClass('active');
      });
      $(document).on('click', function(e) {
          if (!$(e.target).closest('.cart-subscription').length) {
              $('.cart-subscription').removeClass('active');
          }
      });
    }
    if($('#cart_terms_accept-wrap').length > 0){
      $(document).on('change', '#cart_terms_accept' ,function (e) {
        $(this).is(':checked')?$('#CartDrawer-Checkout').removeAttr('disabled'):$('#CartDrawer-Checkout').attr('disabled', true);
      });
    };
    // ------------ Cart Drawer

    // ------------  Complementary Product Select
    if ($('.complementary-products-wrap').length || $('.complementary-products').length) {
      $(document).on('click', '.complementary-select-wrap', function (e) {
          e.stopPropagation();
      });
      $(document).on('click', '.complementary-select-btn', function (e) {
          e.stopPropagation();
          $(this).closest('.complementary-select-wrap').toggleClass('is-open');
      });

      $(document).on('click', function () {
          $('.complementary-select-wrap.is-open').removeClass('is-open');
      });

      $(document).on('change', '.complementary-select-wrap input[type="radio"]', function () {
          var $radio = $(this);
          var price = $radio.data('price');
          var label = $radio.data('label');

          var $productCard = $radio.closest('.complementary-product-card');
          if (!$productCard.length) return;

          if (price) {
              $productCard.find('.block-price').text(price);
          }

          $productCard.find('.complementary-select-btn span').text(label);
      });
    }
    // ------------  Complementary Product Select

});

// Custom Js