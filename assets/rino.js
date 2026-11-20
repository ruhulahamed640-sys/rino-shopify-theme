/* ==========================================================================
   RINO — Vanilla JavaScript Storefront Engine
   Native Shopify AJAX Cart API, Real Variant Selection, Gallery, Recently Viewed,
   Accessible Drawers & Modals (Zero external libraries)
   ========================================================================== */

(function () {
  'use strict';

  const RINO = window.RINO || {};

  /* ------------------------------------------------------------------------
     Utility Helpers
     ------------------------------------------------------------------------ */
  function formatMoney(cents) {
    const amount = (Number(cents || 0) / 100).toFixed(2);
    const format = RINO.moneyFormat || '${{amount}}';
    return format
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(Number(cents || 0) / 100).toString())
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, amount.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/g, amount);
  }

  function announce(message) {
    const region = document.getElementById('RinoLiveRegion');
    if (region) {
      region.textContent = '';
      window.setTimeout(() => {
        region.textContent = message;
      }, 50);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------------
     Accessible Drawer / Modal Controller
     ------------------------------------------------------------------------ */
  function createOverlayController(element, focusSelector, animate = false) {
    if (!element) return null;
    let lastFocused = null;
    let closeTimer = null;

    function open() {
      if (closeTimer) window.clearTimeout(closeTimer);
      lastFocused = document.activeElement;
      element.hidden = false;
      if (animate) {
        element.classList.remove('is-closing');
        window.requestAnimationFrame(() => element.classList.add('is-open'));
      }
      document.body.classList.add('rino-scroll-locked');
      const target = focusSelector ? element.querySelector(focusSelector) : element.querySelector('[tabindex="-1"], button, input, a');
      if (target) target.focus();
    }

    function close() {
      if (animate && !element.hidden) {
        element.classList.remove('is-open');
        element.classList.add('is-closing');
        closeTimer = window.setTimeout(() => {
          element.hidden = true;
          element.classList.remove('is-closing');
          closeTimer = null;
        }, 480);
      } else {
        element.hidden = true;
      }
      document.body.classList.remove('rino-scroll-locked');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    return { open, close, el: element };
  }

  const cartDrawerEl = document.getElementById('RinoCartDrawer');
  const mobileNavEl = document.getElementById('RinoMobileNav');
  const searchModalEl = document.getElementById('RinoSearchModal');

  const cartDrawer = createOverlayController(cartDrawerEl, '.rino-drawer__panel');
  const mobileNav = createOverlayController(mobileNavEl, '.rino-mobile-nav__panel button', true);
  const searchModal = createOverlayController(searchModalEl, 'input[type="search"]');

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]') && cartDrawer) {
      e.preventDefault();
      refreshCartDrawer().then(() => cartDrawer.open());
    }
    if (e.target.closest('[data-cart-close]') && cartDrawer) {
      cartDrawer.close();
    }
    if (e.target.closest('[data-mobile-nav-open]') && mobileNav) {
      e.preventDefault();
      mobileNav.open();
      e.target.closest('[data-mobile-nav-open]')?.setAttribute('aria-expanded', 'true');
    }
    if (e.target.closest('[data-mobile-nav-close]') && mobileNav) {
      mobileNav.close();
      document.querySelector('[data-mobile-nav-open]')?.setAttribute('aria-expanded', 'false');
    }
    if (e.target.closest('#RinoMobileNav a') && mobileNav) {
      mobileNav.close();
      document.querySelector('[data-mobile-nav-open]')?.setAttribute('aria-expanded', 'false');
    }
    if (e.target.closest('[data-search-open]') && searchModal) {
      e.preventDefault();
      searchModal.open();
    }
    if (e.target.closest('[data-search-close]') && searchModal) {
      searchModal.close();
    }
    if (searchModalEl && e.target === searchModalEl) {
      searchModal.close();
    }
  });

  /* ------------------------------------------------------------------------
     Shopify Native AJAX Cart Engine
     ------------------------------------------------------------------------ */
  function updateCartBadges(count) {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(count);
      if (el.classList.contains('rino-cart-badge')) {
        el.classList.toggle('is-empty', count === 0);
      }
    });
  }

  function showCartError(message) {
    document.querySelectorAll('[data-cart-error]').forEach((el) => {
      if (message) {
        el.textContent = message;
        el.hidden = false;
      } else {
        el.textContent = '';
        el.hidden = true;
      }
    });
  }

  function renderCartDrawerItems(cart) {
    const body = document.querySelector('[data-cart-drawer-body]');
    const footer = document.querySelector('[data-cart-drawer-footer]');
    const subtotalEl = document.querySelector('[data-cart-subtotal]');
    if (!body) return;

    updateCartBadges(cart.item_count);
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);

    if (cart.item_count === 0) {
      if (footer) footer.hidden = true;
      body.innerHTML = `
        <div class="rino-cart-empty">
          <p class="rino-cart-empty__text">${escapeHtml(RINO.strings?.emptyCart || 'Your bag is currently empty.')}</p>
          <a href="/collections/all" class="rino-btn rino-btn--primary" data-cart-close>Continue Shopping</a>
        </div>
      `;
      return;
    }

    if (footer) footer.hidden = false;

    const itemsHtml = cart.items
      .map((item) => {
        const variantHtml =
          item.variant_title && item.variant_title !== 'Default Title'
            ? `<p class="rino-cart-item__variant">${escapeHtml(item.variant_title)}</p>`
            : '';
        const imageHtml = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.product_title)}" width="90" height="112" loading="lazy">`
          : '';
        const compareHtml =
          item.original_line_price > item.final_line_price
            ? `<s class="rino-cart-item__price-compare">${formatMoney(item.original_line_price)}</s>`
            : '';
        const discountsHtml = (item.line_level_discount_allocations || []).length
          ? `<ul class="rino-cart-item__discounts" role="list">${item.line_level_discount_allocations
              .map(
                (d) =>
                  `<li>${escapeHtml(d.discount_application.title)} (-${formatMoney(d.amount)})</li>`
              )
              .join('')}</ul>`
          : '';

        return `
          <li class="rino-cart-item" data-cart-item-key="${escapeHtml(item.key)}">
            <a href="${escapeHtml(item.url)}" class="rino-cart-item__media">${imageHtml}</a>
            <div class="rino-cart-item__details">
              <div class="rino-cart-item__top">
                <a href="${escapeHtml(item.url)}" class="rino-cart-item__title">${escapeHtml(item.product_title)}</a>
                <button type="button" class="rino-cart-item__remove" data-cart-remove="${escapeHtml(item.key)}" aria-label="Remove ${escapeHtml(item.product_title)}">&times;</button>
              </div>
              ${variantHtml}
              ${discountsHtml}
              <div class="rino-cart-item__bottom">
                <div class="rino-qty rino-qty--sm">
                  <button type="button" class="rino-qty__btn" data-cart-qty-change data-key="${escapeHtml(item.key)}" data-delta="-1" aria-label="Decrease quantity">&minus;</button>
                  <input type="number" class="rino-qty__input" value="${item.quantity}" min="0" data-cart-qty-input data-key="${escapeHtml(item.key)}" aria-label="Quantity">
                  <button type="button" class="rino-qty__btn" data-cart-qty-change data-key="${escapeHtml(item.key)}" data-delta="1" aria-label="Increase quantity">+</button>
                </div>
                <div class="rino-cart-item__price">
                  ${compareHtml}
                  <span>${formatMoney(item.final_line_price)}</span>
                </div>
              </div>
            </div>
          </li>
        `;
      })
      .join('');

    body.innerHTML = `<ul class="rino-cart-items" role="list">${itemsHtml}</ul>`;
  }

  async function refreshCartDrawer() {
    const body = document.querySelector('[data-cart-drawer-body]');
    if (body) body.classList.add('is-loading');
    try {
      const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load cart');
      const cart = await res.json();
      renderCartDrawerItems(cart);
      showCartError('');
      return cart;
    } catch (err) {
      showCartError(RINO.strings?.cartError || 'Unable to load cart.');
      return null;
    } finally {
      if (body) body.classList.remove('is-loading');
    }
  }

  async function changeCartLine(key, quantity) {
    const body = document.querySelector('[data-cart-drawer-body]');
    if (body) body.classList.add('is-loading');
    try {
      const res = await fetch((RINO.routes?.cart_change_url || '/cart/change') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: Math.max(0, Number(quantity)) })
      });
      const data = await res.json();
      if (!res.ok) {
        showCartError(data.description || data.message || RINO.strings?.cartError);
        return;
      }
      renderCartDrawerItems(data);
      showCartError('');
      announce('Bag updated.');
      if (document.body.classList.contains('template-cart')) {
        window.location.reload();
      }
    } catch (err) {
      showCartError(RINO.strings?.cartError || 'Unable to update bag.');
    } finally {
      if (body) body.classList.remove('is-loading');
    }
  }

  document.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-cart-remove]');
    if (removeBtn) {
      e.preventDefault();
      changeCartLine(removeBtn.dataset.cartRemove, 0);
      return;
    }
    const qtyBtn = e.target.closest('[data-cart-qty-change]');
    if (qtyBtn) {
      e.preventDefault();
      const key = qtyBtn.dataset.key;
      const delta = Number(qtyBtn.dataset.delta || 0);
      const input = qtyBtn.parentElement.querySelector('[data-cart-qty-input]');
      const nextVal = Math.max(0, (Number(input?.value) || 1) + delta);
      changeCartLine(key, nextVal);
    }
  });

  document.addEventListener('change', (e) => {
    const qtyInput = e.target.closest('[data-cart-qty-input]');
    if (qtyInput && qtyInput.dataset.key) {
      changeCartLine(qtyInput.dataset.key, Number(qtyInput.value));
    }
  });

  /* ------------------------------------------------------------------------
     Product Form: Real Shopify Variants, Media Switching, AJAX Add to Cart
     ------------------------------------------------------------------------ */
  function initProductPage() {
    const pdpRoot = document.querySelector('[data-product-root]');
    if (!pdpRoot) return;

    const variantsScript = pdpRoot.querySelector('[data-product-variants]');
    let variants = [];
    try {
      variants = JSON.parse(variantsScript?.textContent || '[]');
    } catch (e) {
      variants = [];
    }

    const form = pdpRoot.querySelector('[data-product-form]');
    const variantInput = form?.querySelector('input[name="id"]');
    const submitBtn = form?.querySelector('[data-add-to-cart]');
    const submitText = submitBtn?.querySelector('[data-add-to-cart-text]');
    const priceEl = pdpRoot.querySelector('[data-product-price]');
    const compareEl = pdpRoot.querySelector('[data-compare-price]');
    const availabilityEl = pdpRoot.querySelector('[data-product-availability]');
    const availabilityText = pdpRoot.querySelector('[data-product-availability-text]');
    const errorEl = pdpRoot.querySelector('[data-product-form-error]');

    // Product Gallery Thumbnail Switching
    const thumbs = pdpRoot.querySelectorAll('[data-media-thumb]');
    const stageItems = pdpRoot.querySelectorAll('[data-media-item]');

    function selectMediaById(mediaId) {
      if (!mediaId) return;
      stageItems.forEach((item) => {
        item.hidden = item.dataset.mediaItem !== String(mediaId);
      });
      thumbs.forEach((btn) => {
        btn.setAttribute('aria-current', btn.dataset.mediaThumb === String(mediaId) ? 'true' : 'false');
      });
    }

    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => selectMediaById(btn.dataset.mediaThumb));
    });

    // Quantity stepper on PDP
    const pdpQtyInput = pdpRoot.querySelector('[data-pdp-qty-input]');
    pdpRoot.querySelectorAll('[data-pdp-qty-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!pdpQtyInput) return;
        const delta = Number(btn.dataset.delta || 0);
        pdpQtyInput.value = String(Math.max(1, (Number(pdpQtyInput.value) || 1) + delta));
      });
    });

    // Real Shopify Variant Resolution
    function getSelectedOptions() {
      const groups = pdpRoot.querySelectorAll('[data-option-group]');
      return Array.from(groups).map((group) => {
        const checked = group.querySelector('input[type="radio"]:checked');
        const select = group.querySelector('select');
        return checked ? checked.value : select ? select.value : null;
      });
    }

    function updateVariantUI() {
      const selected = getSelectedOptions();
      // Update legend labels
      pdpRoot.querySelectorAll('[data-option-group]').forEach((group, idx) => {
        const labelVal = group.querySelector('[data-option-selected-value]');
        if (labelVal && selected[idx]) labelVal.textContent = selected[idx];
      });

      const match = variants.find((v) =>
        selected.every((opt, i) => v.options[i] === opt)
      );

      if (!match) {
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = RINO.strings?.unavailable || 'Unavailable';
        if (availabilityEl) availabilityEl.classList.add('is-sold-out');
        if (availabilityText) availabilityText.textContent = RINO.strings?.unavailable || 'Unavailable';
        return;
      }

      if (variantInput) variantInput.value = String(match.id);

      // Update URL parameter without reload
      const url = new URL(window.location.href);
      url.searchParams.set('variant', String(match.id));
      window.history.replaceState({}, '', url.toString());

      // Update Price & Compare-at Price
      if (priceEl) {
        priceEl.textContent = formatMoney(match.price);
        priceEl.classList.toggle('rino-price__current--sale', Boolean(match.compare_at_price && match.compare_at_price > match.price));
      }
      if (compareEl) {
        if (match.compare_at_price && match.compare_at_price > match.price) {
          compareEl.textContent = formatMoney(match.compare_at_price);
          compareEl.hidden = false;
        } else {
          compareEl.hidden = true;
        }
      }

      // Update Availability & CTA
      if (match.available) {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = RINO.strings?.addToCart || 'Add to Bag';
        if (availabilityEl) availabilityEl.classList.remove('is-sold-out');
        if (availabilityText) availabilityText.textContent = availabilityEl?.dataset.inStockLabel || 'In Stock';
      } else {
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = RINO.strings?.soldOut || 'Sold Out';
        if (availabilityEl) availabilityEl.classList.add('is-sold-out');
        if (availabilityText) availabilityText.textContent = availabilityEl?.dataset.soldOutLabel || 'Sold Out';
      }

      // Switch featured media if variant has one
      if (match.featured_media && match.featured_media.id) {
        selectMediaById(match.featured_media.id);
      }
    }

    pdpRoot.addEventListener('change', (e) => {
      if (e.target.closest('[data-option-group]')) {
        updateVariantUI();
      }
    });

    // AJAX Add to Cart Submission
    if (form && RINO.cartType === 'drawer') {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.hidden = true;
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = RINO.strings?.adding || 'Adding...';

        try {
          const formData = new FormData(form);
          const res = await fetch((RINO.routes?.cart_add_url || '/cart/add') + '.js', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData
          });
          const data = await res.json();
          if (!res.ok) {
            if (errorEl) {
              errorEl.textContent = data.description || data.message || RINO.strings?.cartError;
              errorEl.hidden = false;
            }
            return;
          }
          await refreshCartDrawer();
          if (cartDrawer) cartDrawer.open();
          announce('Added to bag.');
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = RINO.strings?.cartError || 'Unable to add item.';
            errorEl.hidden = false;
          }
        } finally {
          const selectedVariant = variants.find(
            (variant) => String(variant.id) === String(variantInput?.value)
          );
          const canAddToCart = Boolean(selectedVariant && selectedVariant.available);

          if (submitBtn) submitBtn.disabled = !canAddToCart;
          if (submitText) {
            submitText.textContent = canAddToCart
              ? (RINO.strings?.addToCart || 'Add to Bag')
              : (selectedVariant
                ? (RINO.strings?.soldOut || 'Sold Out')
                : (RINO.strings?.unavailable || 'Unavailable'));
          }
        }
      });
    }

    // Track Recently Viewed Product
    const currentHandle = pdpRoot.dataset.productHandle;
    if (currentHandle) {
      try {
        const key = 'rino_recently_viewed';
        const stored = JSON.parse(localStorage.getItem(key) || '[]').filter((h) => h !== currentHandle);
        stored.unshift(currentHandle);
        localStorage.setItem(key, JSON.stringify(stored.slice(0, 8)));
      } catch (e) {
        // Ignore storage errors in private browsing
      }
    }
  }

  /* ------------------------------------------------------------------------
     Recently Viewed Products Renderer (Real Shopify /products/<handle>.js)
     ------------------------------------------------------------------------ */
  async function initRecentlyViewed() {
    const container = document.querySelector('[data-recently-viewed]');
    if (!container) return;
    const grid = container.querySelector('[data-recently-viewed-grid]');
    const currentHandle = container.dataset.currentHandle || '';
    if (!grid) return;

    let handles = [];
    try {
      handles = JSON.parse(localStorage.getItem('rino_recently_viewed') || '[]')
        .filter((h) => h && h !== currentHandle)
        .slice(0, 4);
    } catch (e) {
      handles = [];
    }

    if (!handles.length) return;

    const products = await Promise.all(
      handles.map(async (handle) => {
        try {
          const res = await fetch(`/products/${encodeURIComponent(handle)}.js`);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          return null;
        }
      })
    );

    const valid = products.filter(Boolean);
    if (!valid.length) return;

    grid.innerHTML = valid
      .map((p) => {
        const img = p.featured_image
          ? `<img src="${escapeHtml(p.featured_image)}" alt="${escapeHtml(p.title)}" class="rino-product-card__img rino-product-card__img--primary" loading="lazy">`
          : '';
        return `
          <article class="rino-product-card">
            <a href="${escapeHtml(p.url)}" class="rino-product-card__media-link" aria-label="${escapeHtml(p.title)}">
              <div class="rino-product-card__media">${img}</div>
            </a>
            <div class="rino-product-card__info">
              <h3 class="rino-product-card__title"><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></h3>
              <div class="rino-price"><span class="rino-price__current">${formatMoney(p.price)}</span></div>
            </div>
          </article>
        `;
      })
      .join('');

    container.hidden = false;
  }

  /* ------------------------------------------------------------------------
     Collection Sort & Storefront Filters
     ------------------------------------------------------------------------ */
  function initCollectionControls() {
    const sortControl = document.querySelector('[data-sort-control]');
    if (sortControl) {
      const trigger = sortControl.querySelector('[data-sort-trigger]');
      const menu = sortControl.querySelector('[data-sort-menu]');
      const options = sortControl.querySelectorAll('[data-sort-value]');

      const closeSortMenu = () => {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        menu.hidden = isOpen;
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });

      options.forEach((option) => {
        option.addEventListener('click', () => {
          const url = new URL(window.location.href);
          url.searchParams.set('sort_by', option.dataset.sortValue);
          url.searchParams.delete('page');
          window.location.href = url.toString();
        });
      });

      document.addEventListener('click', (event) => {
        if (!sortControl.contains(event.target)) closeSortMenu();
      });

      sortControl.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeSortMenu();
          trigger.focus();
        }
        if (event.key === 'ArrowDown' && trigger.getAttribute('aria-expanded') === 'true') {
          event.preventDefault();
          options[0]?.focus();
        }
        if (event.key === 'ArrowDown' && event.target.matches('[data-sort-value]')) {
          event.preventDefault();
          (event.target.nextElementSibling || options[0])?.focus();
        }
        if (event.key === 'ArrowUp' && event.target.matches('[data-sort-value]')) {
          event.preventDefault();
          (event.target.previousElementSibling || options[options.length - 1])?.focus();
        }
      });
    }

    const productGrid = document.querySelector('[data-product-grid]');
    const viewButtons = document.querySelectorAll('[data-product-view]');
    if (productGrid && viewButtons.length) {
      let savedView = 'grid';
      try {
        savedView = window.localStorage.getItem('rino-product-view') || 'grid';
      } catch (error) {}
      const setView = (view) => {
        const nextView = view === 'list' ? 'list' : 'grid';
        productGrid.classList.toggle('is-list-view', nextView === 'list');
        viewButtons.forEach((button) => {
          const active = button.dataset.productView === nextView;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        try {
          window.localStorage.setItem('rino-product-view', nextView);
        } catch (error) {}
      };
      viewButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.productView)));
      setView(savedView);

      const cards = productGrid.querySelectorAll('[data-product-reveal-card]');
      const touchMode = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if (touchMode && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle('is-card-visible', entry.isIntersecting && entry.intersectionRatio >= 0.42);
          });
        }, { threshold: [0, 0.2, 0.42, 0.7], rootMargin: '0px 0px -6% 0px' });
        cards.forEach((card) => revealObserver.observe(card));
      } else if (touchMode) {
        cards.forEach((card) => card.classList.add('is-card-visible'));
      }
    }

    const filterForm = document.querySelector('[data-collection-filter-form]');
    if (filterForm) {
      filterForm.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          filterForm.submit();
        }
      });
    }
  }

  function initRinoPromoSliders() {
    document.querySelectorAll('[data-rino-promo-slider]').forEach((slider) => {
      const slides = Array.from(slider.querySelectorAll('[data-rino-promo-slide]'));
      const dots = Array.from(slider.querySelectorAll('[data-rino-promo-dot]'));
      const current = slider.querySelector('[data-rino-promo-current]');
      if (slides.length < 2) return;
      let active = 0;
      let timer = null;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const show = (index) => {
        active = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          const selected = i === active;
          slide.classList.toggle('is-active', selected);
          slide.setAttribute('aria-hidden', String(!selected));
        });
        dots.forEach((dot, i) => {
          const selected = i === active;
          dot.classList.toggle('is-active', selected);
          dot.setAttribute('aria-pressed', String(selected));
        });
        if (current) current.textContent = String(active + 1).padStart(2, '0');
      };
      const stop = () => { if (timer) window.clearInterval(timer); timer = null; };
      const start = () => {
        stop();
        if (!reducedMotion && !document.hidden) timer = window.setInterval(() => show(active + 1), 3000);
      };
      dots.forEach((dot) => dot.addEventListener('click', () => { show(Number(dot.dataset.rinoPromoDot)); start(); }));
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('focusin', stop);
      slider.addEventListener('focusout', (event) => { if (!slider.contains(event.relatedTarget)) start(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
      show(0);
      start();
    });
  }


  function initRinoGlobalExperience() {
    const root = document.documentElement;
    const progress = document.querySelector('[data-rino-scroll-progress]');
    const backToTop = document.querySelector('[data-rino-back-to-top]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;

    const updateScrollUI = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
      if (progress) progress.style.width = percent + '%';
      if (backToTop) {
        const visible = window.scrollY > 480;
        backToTop.hidden = !visible;
        backToTop.classList.toggle('is-visible', visible);
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollUI);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', updateScrollUI);
    updateScrollUI();
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

    const revealTargets = document.querySelectorAll('.rino-section, .rino-hero, .rino-promo-banner, .rino-product-card, .rino-pdp__gallery, .rino-pdp__info, .rino-cart-summary, .rino-collection-header');
    if (!reducedMotion && 'IntersectionObserver' in window) {
      root.dataset.rinoMotionReady = 'true';
      const observer = new IntersectionObserver((entries, instance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
            instance.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
      revealTargets.forEach((element, index) => {
        element.setAttribute('data-rino-reveal', '');
        if (element.classList.contains('rino-product-card')) {
          element.style.setProperty('--rino-reveal-delay', (index % 4) * 75 + 'ms');
        }
        observer.observe(element);
      });
    } else {
      revealTargets.forEach((element) => element.classList.add('is-in-view'));
    }

    document.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-rino-quick-add]');
      if (!form || RINO.cartType !== 'drawer') return;
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const label = button?.querySelector('span');
      if (button) button.disabled = true;
      if (label) label.textContent = 'ADDING...';
      try {
        const response = await fetch((RINO.routes?.cart_add_url || '/cart/add') + '.js', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.description || result.message || 'Unable to add this item.');
        await refreshCartDrawer();
        if (cartDrawer) cartDrawer.open();
        announce('Added to bag.');
      } catch (error) {
        announce(error.message || 'Unable to add this item.');
        if (label) label.textContent = 'TRY AGAIN';
      } finally {
        if (button) button.disabled = false;
        if (label && label.textContent === 'ADDING...') label.textContent = 'QUICK ADD';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRinoGlobalExperience();
    initRinoHeroInteractions();
    initRinoHeaderScrollState();
    initRinoPromoSliders();
    initProductPage();
    initRecentlyViewed();
    initCollectionControls();
  });
})();


/* RINO hero pointer spotlight and text entrance */
function initRinoHeroInteractions(){
  document.querySelectorAll('.rino-hero__frame').forEach((frame)=>{
    const content=frame.querySelector('.rino-hero__content');
    if(content){
      if('IntersectionObserver' in window){
        const observer=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{if(entry.isIntersecting){content.classList.add('is-hero-revealed');observer.disconnect();}});},{threshold:.18});
        observer.observe(content);
      }else{content.classList.add('is-hero-revealed');}
    }
    if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    frame.addEventListener('pointermove',(event)=>{
      const rect=frame.getBoundingClientRect();
      frame.style.setProperty('--hero-pointer-x',((event.clientX-rect.left)/rect.width*100)+'%');
      frame.style.setProperty('--hero-pointer-y',((event.clientY-rect.top)/rect.height*100)+'%');
      frame.classList.add('is-pointer-active');
    });
    frame.addEventListener('pointerleave',()=>frame.classList.remove('is-pointer-active'));
  });
}


/* Scroll-triggered liquid pour — works on storefront and Shopify Theme Editor reloads */
(function initRinoLiquidFlow(){
  const observed = new WeakSet();

  function observeLiquidSections(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const sections = [];
    if (scope.matches && scope.matches('[data-rino-liquid-flow]')) sections.push(scope);
    scope.querySelectorAll('[data-rino-liquid-flow]').forEach((section) => sections.push(section));
    if (!sections.length) return;

    sections.forEach((section) => {
      if (observed.has(section)) return;
      observed.add(section);

      if (!('IntersectionObserver' in window)) {
        section.classList.add('is-flowing');
        return;
      }

      let wasVisible = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !wasVisible) {
            wasVisible = true;
            section.classList.remove('is-flowing');
            void section.offsetWidth;
            section.classList.add('is-flowing');
          } else if (!entry.isIntersecting && wasVisible) {
            wasVisible = false;
            section.classList.remove('is-flowing');
          }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px 22% 0px' });

      observer.observe(section);
    });
  }

  function boot() { observeLiquidSections(document); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', (event) => observeLiquidSections(event.target));
  document.addEventListener('shopify:section:reorder', boot);
})();
