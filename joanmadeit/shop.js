const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const cartOverlay = document.querySelector('#cart-overlay');
    const productOverlay = document.querySelector('#product-overlay');
    const checkoutOverlay = document.querySelector('#checkout-overlay');
    const cartItems = document.querySelector('#cart-items');
    const toast = document.querySelector('#toast');
    const money = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    });
    let activeProduct = null;
    let toastTimer;

    function showToast(message) {
      toast.textContent = message;
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
    }

    function loadCart() {
      try {
        const savedCart = localStorage.getItem('jmi-shopping-bag');
        const parsedCart = savedCart ? JSON.parse(savedCart) : [];
        if (!Array.isArray(parsedCart)) throw new TypeError('Saved shopping bag is not a list.');
        return parsedCart.filter(item => item && typeof item.id === 'string' && typeof item.size === 'string' && Number.isFinite(item.price) && Number.isInteger(item.quantity) && item.quantity > 0);
      } catch (error) {
        console.error('Could not load the saved JMI shopping bag.', error);
        showToast('Your saved bag could not be loaded. You can still shop in this visit.');
        return [];
      }
    }

    let cart = loadCart();

    function saveCart() {
      try {
        localStorage.setItem('jmi-shopping-bag', JSON.stringify(cart));
      } catch (error) {
        console.error('Could not save the JMI shopping bag.', error);
        showToast('Your bag could not be saved on this device.');
      }
    }

    function renderCart() {
      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
      const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      document.querySelector('#cart-count').textContent = itemCount;
      document.querySelector('#cart-total').textContent = money.format(total);
      document.querySelector('#checkout-button').disabled = cart.length === 0;

      if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your bag is empty for now. Take a look around and see what catches your eye.</p>';
        return;
      }

      cartItems.innerHTML = cart.map((item, index) => {
        return `<article class="cart-item">
          <img src="${item.image}" alt="">
          <div>
            <h3>${item.title}</h3>
            <p>${item.size} · From ${money.format(item.price)}</p>
            <div class="cart-item-bottom">
              <div class="quantity-control" aria-label="Quantity">
                <button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Decrease quantity">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-action="increase" data-index="${index}" aria-label="Increase quantity">＋</button>
              </div>
              <button class="remove-item" type="button" data-cart-action="remove" data-index="${index}">Remove</button>
            </div>
          </div>
        </article>`;
      }).join('');
    }

    function setOverlay(overlay, isOpen) {
      overlay.hidden = !isOpen;
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function openCart() {
      renderCart();
      setOverlay(cartOverlay, true);
      cartOverlay.querySelector('[data-close-cart]').focus();
    }

    document.querySelector('#open-cart').addEventListener('click', openCart);
    document.querySelector('[data-close-cart]').addEventListener('click', () => setOverlay(cartOverlay, false));
    cartOverlay.addEventListener('click', event => {
      if (event.target === cartOverlay) setOverlay(cartOverlay, false);
    });

    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      navLinks.classList.toggle('is-open', !isOpen);
    });

    navLinks.addEventListener('click', event => {
      if (event.target.closest('a') || event.target.closest('#open-cart')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation');
        navLinks.classList.remove('is-open');
      }
    });

    const filterButtons = document.querySelectorAll('.filter-button');
    const productCards = document.querySelectorAll('.product-card');

    function applyFilter(filter) {
      const activeButton = Array.from(filterButtons).find(button => button.dataset.filter === filter);
      const selectedFilter = activeButton ? filter : 'all';
      filterButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === selectedFilter));
      });
      productCards.forEach(card => {
        card.hidden = selectedFilter !== 'all' && !card.dataset.category.split(' ').includes(selectedFilter);
      });
    }

    applyFilter(new URLSearchParams(window.location.search).get('category') || 'all');

    document.querySelectorAll('[data-open-product]').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.product-card');
        const image = card.querySelector('img');
        activeProduct = {
          id: card.dataset.id,
          title: card.querySelector('h3').textContent,
          description: card.querySelector('.product-info > p').textContent,
          image: image.src,
          imageAlt: image.alt,
          price: Number(card.dataset.price)
        };
        document.querySelector('#product-dialog-name').textContent = activeProduct.title;
        document.querySelector('#product-dialog-description').textContent = activeProduct.description;
        document.querySelector('#product-dialog-image').src = activeProduct.image;
        document.querySelector('#product-dialog-image').alt = activeProduct.imageAlt;
        document.querySelector('#product-dialog-price').textContent = `From ${money.format(activeProduct.price)}`;
        document.querySelector('#product-size').value = '';
        setOverlay(productOverlay, true);
        productOverlay.querySelector('[data-close-product]').focus();
      });
    });

    document.querySelector('[data-close-product]').addEventListener('click', () => setOverlay(productOverlay, false));
    productOverlay.addEventListener('click', event => {
      if (event.target === productOverlay) setOverlay(productOverlay, false);
    });

    document.querySelector('#add-to-bag-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!activeProduct) return;
      const size = document.querySelector('#product-size').value;
      if (!size) return;
      const existingItem = cart.find(item => item.id === activeProduct.id && item.size === size);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ ...activeProduct, size, quantity: 1 });
      }
      saveCart();
      renderCart();
      setOverlay(productOverlay, false);
      showToast(`${activeProduct.title} added to your bag.`);
    });

    cartItems.addEventListener('click', event => {
      const button = event.target.closest('[data-cart-action]');
      if (!button) return;
      const item = cart[Number(button.dataset.index)];
      if (!item) return;
      if (button.dataset.cartAction === 'increase') item.quantity += 1;
      if (button.dataset.cartAction === 'decrease') item.quantity -= 1;
      if (button.dataset.cartAction === 'remove' || item.quantity < 1) {
        cart.splice(Number(button.dataset.index), 1);
      }
      saveCart();
      renderCart();
    });

    document.querySelector('#checkout-button').addEventListener('click', () => {
      if (!cart.length) return;
      setOverlay(cartOverlay, false);
      setOverlay(checkoutOverlay, true);
      checkoutOverlay.querySelector('#customer-name').focus();
    });

    document.querySelector('[data-close-checkout]').addEventListener('click', () => setOverlay(checkoutOverlay, false));
    checkoutOverlay.addEventListener('click', event => {
      if (event.target === checkoutOverlay) setOverlay(checkoutOverlay, false);
    });

    document.querySelector('#checkout-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity() || !cart.length) return;
      const formData = new FormData(event.currentTarget);
      const name = String(formData.get('name')).trim();
      const phone = String(formData.get('phone')).trim();
      const note = String(formData.get('note')).trim();
      const orderLines = cart.map(item => {
        return `${item.title} (${item.size}) × ${item.quantity} — from ${money.format(item.price)} each`;
      });
      const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const message = [
        'Hello Joan, I would like to place an order from the JMI website.',
        '',
        `Name: ${name}`,
        `My WhatsApp: ${phone}`,
        '',
        'My bag:',
        ...orderLines,
        `Estimated starting subtotal: ${money.format(subtotal)}`,
        '',
        'I understand that final pricing and delivery will be confirmed before payment.',
        note ? `Notes: ${note}` : ''
      ].filter(Boolean).join('\n');
      const whatsappUrl = `https://wa.me/2348166604086?text=${encodeURIComponent(message)}`;
      const sendWhatsapp = document.querySelector('#send-whatsapp');
      sendWhatsapp.href = whatsappUrl;
      sendWhatsapp.hidden = false;
      document.querySelector('#checkout-message').textContent = 'Your order is ready. Open WhatsApp and tap Send to place it with Joan.';
    });

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        applyFilter(button.dataset.filter);
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!checkoutOverlay.hidden) setOverlay(checkoutOverlay, false);
        else if (!productOverlay.hidden) setOverlay(productOverlay, false);
        else if (!cartOverlay.hidden) setOverlay(cartOverlay, false);
      }
    });

    renderCart();
    document.querySelector('#year').textContent = new Date().getFullYear();