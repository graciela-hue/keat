class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      if (!event.target.closest('.cart-discount__form') || !event.target.closest('.cart-subscription-options')) {
        this.onChange(event);
      }
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
    this.initDiscountEvents();
    this.cartItemSubscribe();
  }

  cartUpdateUnsubscriber = undefined;

  cartItemSubscribe(){
    document.addEventListener('click', (e) => {
      const subscribe_opt = e.target.closest('.block-subscribe');
      if (!subscribe_opt) return;
      e.preventDefault();
      if (!subscribe_opt.classList.contains('selected')) {
        subscribe_opt.parentElement.querySelectorAll('.block-subscribe').forEach(item => {
          item.classList.remove('selected');
        });
        e.target.classList.add('selected');
        subscribe_opt.closest('.cart-subscription').classList.remove('active');
        var line = e.target.dataset.item;
        var quantity = e.target.dataset.quantity*1;
        var line_plan = e.target.dataset.val;
        var variantId = e.target.dataset.variantId;
        // console.log(line + ' ' + quantity + ' ' + line_plan + ' ' + variantId);
        
        const body = JSON.stringify({
          line,
          quantity,
          selling_plan: line_plan ? line_plan : null,
          sections: this.getSectionsToRender().map((section) => section.section),
          sections_url: window.location.pathname,
        });

        this.enableLoading(line);

        fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
        .then(response => response.json())
        .then(cart => {
          return this.onCartUpdate();
        }).then(() => {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items'});
        }).catch(console.error).finally(() => {
          this.disableLoading(line);
        });;
      }
    });
  }

  initDiscountEvents() {
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('.cart-discount__form');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('[name="discount"]');
      if (!input || !input.value.trim()) return;
      this.applyDiscountCode(input.value.trim());
    });

    // document.addEventListener('click', (e) => {
    //   const removeBtn = e.target.closest('.cancel-discount');
    //   if (!removeBtn) return;
    //   e.preventDefault();
    //   const discountCode = removeBtn.closest('.discounts__discount').dataset.discountCode || '';
    //   this.removeDiscountCode(discountCode);
    // });
  }

  showDiscountError(message) {
    const errorEl = document.querySelector('#cart_discount-error');
    if (!errorEl) return;
    errorEl.textContent = message;
  }

  clearDiscountError() {
    const errorEl = document.querySelector('#cart_discount-error');
    if (!errorEl) return;
    errorEl.textContent = '';
  }

  getExistingDiscounts() {
    const discounts = [];
    document.querySelectorAll('.discounts__discount').forEach((item) => {
      const code = item.dataset.discountCode;
      if (code) {
        discounts.push(code);
      }
    });
    return discounts;
  }

  applyDiscountCode(discountCode) {
    if (!discountCode) return;
    if (discountCode == '_blank') discountCode = '';
    this.clearDiscountError?.();
    const existingDiscounts = this.getExistingDiscounts();

    if (existingDiscounts.includes(discountCode)) {
      this.showDiscountError('Discount code already applied.');
      return;
    }

    const config = fetchConfig('javascript');
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];
    const body = new FormData();

    body.append('discount', [...existingDiscounts, discountCode].join(','));

    const sectionIds = this.getSectionsToRender().map( section => section.section );

    if (sectionIds.length) {
      body.append('sections', sectionIds.join(','));
      body.append('sections_url', window.location.pathname);
    }

    config.body = body;

    const apply_btn = document.querySelector('#cart_discount-apply');
    if (apply_btn){
      apply_btn.classList.add('loading');
      apply_btn.querySelector('.loading__spinner').classList.remove('hidden');
    }

    fetch('/cart/update.js', config)
      .then(response => response.json())
      .then(cart => {
        const invalidCode = cart.discount_codes?.find(discount => discount.code === discountCode && discount.applicable === false);
        if (invalidCode) {
          this.showDiscountError('Discount code is invalid or not applicable.');
          return;
        }
        return this.onCartUpdate();
      }).then(() => {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items'});
      }).finally(() => {
        if (apply_btn){
          apply_btn.classList.remove('loading');
          apply_btn.querySelector('.loading__spinner').classList.add('hidden');
        }
      }).catch(console.error);
  }

  removeDiscountCode(discountCode) {
    if (!discountCode) return;
    const existingDiscounts = this.getExistingDiscounts();
    const remainingDiscounts = existingDiscounts.filter( code => code !== discountCode);
    const config = fetchConfig('javascript');

    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];

    const body = new FormData();
    body.append('discount', remainingDiscounts.join(','));
    const sectionIds = this.getSectionsToRender().map(section => section.section);
    if (sectionIds.length) {
      body.append('sections', sectionIds.join(','));
      body.append('sections_url', window.location.pathname);
    }
    config.body = body;

    fetch('/cart/update.js', config)
      .then(response => response.json()).then(cart => {
        return this.onCartUpdate()
        .then(() => {
          publish( PUB_SUB_EVENTS.cartUpdate, {source: 'cart-items', cartData: cart});
        });
      })
      .finally(() => {
      }).catch(console.error);
  }

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
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
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer', '.cart-drawer__info'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId) {
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';
    const cartPerformanceUpdateMarker = CartPerformance.createStartingMarker(`${eventTarget}:user-action`);

    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        CartPerformance.measure(`${eventTarget}:paint-updated-sections`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id).querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            this.applyDiscountCode('_blank');
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
            
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
        CartPerformance.measureFromMarker(`${eventTarget}:user-action`, cartPerformanceUpdateMarker);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } }).then(() =>
              CartPerformance.measureFromEvent('note-update:user-action', event)
            );
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}