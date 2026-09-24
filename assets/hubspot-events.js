/**
 * HubSpot - Custom Behavioral Events
 *
 * El add to cart del tema es AJAX (no hay recarga ni cambio de pagina), asi que el
 * evento de HubSpot no se puede disparar con un click en un link. Todo el flujo pasa
 * por <product-form> (assets/product-form.js), que despues de un POST exitoso a
 * routes.cart_add_url publica el evento interno PUB_SUB_EVENTS.cartUpdate con
 * source: 'product-form' y la respuesta de Shopify en cartData.
 *
 * Aqui nos suscribimos a ese evento y empujamos el custom behavioral event a _hsq.
 *
 * Config: snippets/hubspot-tracking.liquid (window.KeatHubSpot)
 */
(function () {
  var config = window.KeatHubSpot || {};
  var EVENT_NAME = config.eventName || 'pe44101840_add_to_cart';
  var DEBUG = config.debug === true || window.location.search.indexOf('hs_debug') !== -1;

  // _hsq lo crea el codigo de seguimiento de HubSpot. Si todavia no cargo, dejamos la
  // cola lista: HubSpot procesa lo acumulado apenas se inicializa.
  window._hsq = window._hsq || [];

  function log() {
    if (!DEBUG) return;
    console.log.apply(console, ['[HubSpot]'].concat([].slice.call(arguments)));
  }

  // Asocia el evento al contacto cuando el cliente tiene sesion iniciada.
  if (config.customer && config.customer.email) {
    window._hsq.push([
      'identify',
      {
        email: config.customer.email,
        firstname: config.customer.firstName || undefined,
        lastname: config.customer.lastName || undefined,
      },
    ]);
    log('identify', config.customer.email);
  }

  function blankToNull(value) {
    return value === '' || value === undefined ? null : value;
  }

  function toId(value) {
    return value === null || value === undefined ? null : String(value);
  }

  // Shopify entrega los precios en centavos.
  function toAmount(cents) {
    return typeof cents === 'number' ? Math.round(cents) / 100 : null;
  }

  /**
   * Shopify entrega la imagen como protocol-relative (//cdn.shopify.com/...) y la url
   * del producto como path relativo (/products/handle?variant=123). HubSpot necesita
   * URLs absolutas.
   */
  function absoluteUrl(value) {
    if (!value) return null;
    if (value.indexOf('//') === 0) return window.location.protocol + value;
    if (value.indexOf('http') === 0) return value;
    if (value.charAt(0) === '/') return window.location.origin + value;
    return null;
  }

  function productImageUrl(item) {
    var image = (item.featured_image && item.featured_image.url) || item.image;
    return absoluteUrl(image);
  }

  // item.url ya viene con el ?variant=; si faltara, la reconstruimos desde el handle.
  function productUrl(item) {
    if (item.url) return absoluteUrl(item.url);
    if (!item.handle) return null;

    var url = '/products/' + item.handle;
    var variantId = item.variant_id || item.id;
    if (variantId) url += '?variant=' + variantId;

    return absoluteUrl(url);
  }

  function currencyCode() {
    if (config.currency) return config.currency;
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      return window.Shopify.currency.active;
    }
    return 'MXN';
  }

  /**
   * /cart/add.js devuelve el line item plano en la raiz cuando se agrega un solo
   * producto, o { items: [...] } cuando se agregan varios. Soportamos ambas formas.
   */
  function lineItemsFrom(cartData) {
    if (!cartData) return [];
    if (Array.isArray(cartData.items)) return cartData.items;
    if (cartData.variant_id || cartData.id) return [cartData];
    return [];
  }

  function buildProperties(item) {
    return {
      product_id: toId(item.product_id),
      variant_id: toId(item.variant_id || item.id),
      product_title: blankToNull(item.product_title || item.title),
      variant_title: blankToNull(item.variant_title),
      sku: blankToNull(item.sku),
      price: toAmount(typeof item.final_price === 'number' ? item.final_price : item.price),
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      currency: currencyCode(),
      product_image_url: productImageUrl(item),
      product_url: productUrl(item),
    };
  }

  function trackAddToCart(cartData) {
    var items = lineItemsFrom(cartData);

    if (!items.length) {
      log('sin line items en la respuesta de /cart/add.js', cartData);
      return;
    }

    items.forEach(function (item) {
      var properties = buildProperties(item);

      window._hsq.push([
        'trackCustomBehavioralEvent',
        {
          name: EVENT_NAME,
          properties: properties,
        },
      ]);

      // Espejo del evento para GTM / otros consumidores (mismo patron que gtag-clicks).
      window.dispatchEvent(new CustomEvent('keat:add_to_cart', { detail: properties }));

      log(EVENT_NAME, properties);
    });
  }

  function init() {
    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') {
      log('pubsub.js no disponible, no se registro el listener de add to cart');
      return;
    }

    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      // cart-items / quick-add tambien publican cartUpdate al cambiar cantidades:
      // solo product-form representa un add to cart real.
      if (!event || event.source !== 'product-form') return;
      trackAddToCart(event.cartData);
    });

    log('listener de add to cart registrado');
  }

  init();
})();
