(function () {
    const inferredApiBaseUrl = (function () {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:4242';
        }
        if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) && window.location.port && window.location.port !== '4242') {
            return 'http://localhost:4242';
        }
        return '';
    })();

    const DEFAULT_CONFIG = {
        publishableKey: '',
        apiBaseUrl: inferredApiBaseUrl,
        currency: 'eur'
    };

    const config = Object.assign({}, DEFAULT_CONFIG, window.NEXLANCE_PAYMENT_CONFIG || {});
    let configPromise = null;
    let stripePromise = null;
    let stripeInstancePromise = null;
    let elements = null;
    let paymentElement = null;
    let activePaymentOptions = null;

    function ensureStyles() {
        if (document.getElementById('nexlance-payment-styles')) return;

        const style = document.createElement('style');
        style.id = 'nexlance-payment-styles';
        style.textContent = `
            .nl-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(6px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 12000;
                padding: 20px;
            }
            .nl-modal-overlay.show {
                display: flex;
            }
            .nl-modal {
                width: min(100%, 560px);
                background: #ffffff;
                border-radius: 24px;
                box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
                overflow: hidden;
            }
            .nl-modal-header {
                padding: 24px 24px 12px;
            }
            .nl-modal-header h3 {
                margin: 0 0 8px;
                font-size: 1.5rem;
                color: #0f172a;
            }
            .nl-modal-header p {
                margin: 0;
                color: #475569;
                line-height: 1.6;
            }
            .nl-modal-body {
                padding: 0 24px 24px;
            }
            .nl-payment-summary {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 16px 18px;
                margin-bottom: 18px;
            }
            .nl-payment-summary strong {
                display: block;
                color: #0f172a;
                font-size: 1rem;
                margin-bottom: 4px;
            }
            .nl-payment-summary span {
                color: #64748b;
                font-size: 0.95rem;
            }
            .nl-payment-amount {
                font-size: 1.3rem;
                font-weight: 700;
                color: #4f46e5;
                white-space: nowrap;
            }
            .nl-actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 18px;
            }
            .nl-btn {
                border: none;
                border-radius: 999px;
                padding: 13px 18px;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            }
            .nl-btn:hover {
                transform: translateY(-1px);
            }
            .nl-btn-primary {
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                color: #ffffff;
                box-shadow: 0 14px 28px rgba(79, 70, 229, 0.25);
                flex: 1 1 220px;
            }
            .nl-btn-secondary {
                background: #e2e8f0;
                color: #0f172a;
                flex: 1 1 160px;
            }
            .nl-payment-message {
                margin-top: 14px;
                min-height: 22px;
                font-size: 0.95rem;
            }
            .nl-payment-message.error {
                color: #dc2626;
            }
            .nl-payment-message.success {
                color: #059669;
            }
            .nl-auth-actions {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                margin-top: 22px;
            }
            .nl-auth-actions a,
            .nl-auth-actions button {
                text-align: center;
                text-decoration: none;
            }
            #nexlancePaymentElement {
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 16px;
                background: #ffffff;
            }
            .nl-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 50%;
                background: #eef2ff;
                color: #4338ca;
                font-size: 1.1rem;
                cursor: pointer;
            }
            .nl-modal-shell {
                position: relative;
            }
            @media (max-width: 640px) {
                .nl-auth-actions {
                    grid-template-columns: 1fr;
                }
                .nl-payment-summary {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureMarkup() {
        if (document.getElementById('nexlanceAuthOverlay')) return;

        ensureStyles();

        const authOverlay = document.createElement('div');
        authOverlay.id = 'nexlanceAuthOverlay';
        authOverlay.className = 'nl-modal-overlay';
        authOverlay.innerHTML = `
            <div class="nl-modal nl-modal-shell" role="dialog" aria-modal="true" aria-labelledby="nexlanceAuthTitle">
                <button type="button" class="nl-close" data-close-auth>&times;</button>
                <div class="nl-modal-header">
                    <h3 id="nexlanceAuthTitle">Create an account or log in first</h3>
                    <p id="nexlanceAuthText">You need to sign in before continuing to secure checkout.</p>
                </div>
                <div class="nl-modal-body">
                    <div class="nl-auth-actions">
                        <a id="nexlanceAuthRegister" class="nl-btn nl-btn-primary" href="login.html?mode=register">Create Account</a>
                        <a id="nexlanceAuthLogin" class="nl-btn nl-btn-secondary" href="login.html">Log In</a>
                    </div>
                </div>
            </div>
        `;

        const paymentOverlay = document.createElement('div');
        paymentOverlay.id = 'nexlancePaymentOverlay';
        paymentOverlay.className = 'nl-modal-overlay';
        paymentOverlay.innerHTML = `
            <div class="nl-modal nl-modal-shell" role="dialog" aria-modal="true" aria-labelledby="nexlancePaymentTitle">
                <button type="button" class="nl-close" data-close-payment>&times;</button>
                <div class="nl-modal-header">
                    <h3 id="nexlancePaymentTitle">Complete your payment</h3>
                    <p id="nexlancePaymentText">Enter your card details to finish checkout securely with Stripe.</p>
                </div>
                <div class="nl-modal-body">
                    <div class="nl-payment-summary">
                        <div>
                            <strong id="nexlancePaymentSummaryTitle">Payment</strong>
                            <span id="nexlancePaymentSummaryText">Secure checkout</span>
                        </div>
                        <div class="nl-payment-amount" id="nexlancePaymentAmount">EUR 0.00</div>
                    </div>
                    <form id="nexlancePaymentForm">
                        <div id="nexlancePaymentElement"></div>
                        <div id="nexlancePaymentMessage" class="nl-payment-message"></div>
                        <div class="nl-actions">
                            <button type="submit" id="nexlancePayNowBtn" class="nl-btn nl-btn-primary">Pay now</button>
                            <button type="button" id="nexlancePaymentCancelBtn" class="nl-btn nl-btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(authOverlay);
        document.body.appendChild(paymentOverlay);

        authOverlay.addEventListener('click', event => {
            if (event.target === authOverlay) hideOverlay(authOverlay);
        });
        paymentOverlay.addEventListener('click', event => {
            if (event.target === paymentOverlay) closePaymentModal();
        });
        document.querySelector('[data-close-auth]').addEventListener('click', () => hideOverlay(authOverlay));
        document.querySelector('[data-close-payment]').addEventListener('click', closePaymentModal);
        document.getElementById('nexlancePaymentCancelBtn').addEventListener('click', closePaymentModal);
        document.getElementById('nexlancePaymentForm').addEventListener('submit', handlePaymentSubmit);
    }

    function showOverlay(overlay) {
        ensureMarkup();
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideOverlay(overlay) {
        overlay.classList.remove('show');
        if (!document.querySelector('.nl-modal-overlay.show')) {
            document.body.style.overflow = '';
        }
    }

    function setPaymentMessage(message, type) {
        const el = document.getElementById('nexlancePaymentMessage');
        if (!el) return;
        el.textContent = message || '';
        el.className = 'nl-payment-message' + (type ? ` ${type}` : '');
    }

    function formatAmount(amountCents, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: String(currency || config.currency || 'eur').toUpperCase()
        }).format((Number(amountCents) || 0) / 100);
    }

    function getCurrentPageWithQuery(extraParams) {
        const url = new URL(window.location.href);
        if (extraParams) {
            Object.keys(extraParams).forEach(key => {
                if (extraParams[key] === null || extraParams[key] === undefined) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, extraParams[key]);
                }
            });
        }
        return `${url.pathname.split('/').pop() || 'index.html'}${url.search}`;
    }

    function isLoggedIn() {
        return localStorage.getItem('nexlance_auth') === '1';
    }

    function showAuthPrompt(options) {
        ensureMarkup();
        const overlay = document.getElementById('nexlanceAuthOverlay');
        const title = document.getElementById('nexlanceAuthTitle');
        const text = document.getElementById('nexlanceAuthText');
        const registerLink = document.getElementById('nexlanceAuthRegister');
        const loginLink = document.getElementById('nexlanceAuthLogin');
        const redirectTarget = options && options.redirectTarget ? options.redirectTarget : getCurrentPageWithQuery();

        title.textContent = (options && options.title) || 'Create an account or log in first';
        text.textContent = (options && options.message) || 'You need to sign in before continuing to secure checkout.';
        registerLink.href = `login.html?mode=register&redirect=${encodeURIComponent(redirectTarget)}`;
        loginLink.href = `login.html?redirect=${encodeURIComponent(redirectTarget)}`;
        showOverlay(overlay);
    }

    function loadStripeJs() {
        if (window.Stripe) return Promise.resolve(window.Stripe);
        if (stripePromise) return stripePromise;

        stripePromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-stripe-js]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.Stripe));
                existing.addEventListener('error', () => reject(new Error('Stripe.js could not be loaded.')));
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.dataset.stripeJs = 'true';
            script.onload = () => resolve(window.Stripe);
            script.onerror = () => reject(new Error('Stripe.js could not be loaded.'));
            document.head.appendChild(script);
        });

        return stripePromise;
    }

    async function ensureRuntimeConfig() {
        if (config.publishableKey) return config;
        if (configPromise) return configPromise;

        configPromise = (async function () {
            let response;
            try {
                response = await fetch(`${config.apiBaseUrl}/api/payment-config`);
            } catch (error) {
                throw new Error('Could not load payment configuration. Start `npm start` and set your Stripe environment keys.');
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Could not load Stripe payment configuration.');
            }

            if (data.publishableKey) config.publishableKey = data.publishableKey;
            if (data.currency) config.currency = data.currency;

            if (!config.publishableKey) {
                throw new Error('Stripe publishable key is missing. Set STRIPE_PUBLISHABLE_KEY before starting the server.');
            }

            return config;
        })();

        return configPromise;
    }

    async function getStripeInstance() {
        if (stripeInstancePromise) {
            return stripeInstancePromise;
        }

        stripeInstancePromise = (async function () {
            await ensureRuntimeConfig();
            const StripeCtor = await loadStripeJs();
            if (!StripeCtor) {
                throw new Error('Stripe.js is unavailable.');
            }
            return StripeCtor(config.publishableKey);
        })();

        return stripeInstancePromise;
    }

    async function createPaymentIntent(options) {
        let response;
        try {
            response = await fetch(`${config.apiBaseUrl}/api/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productCode: options.productCode,
                    description: options.description || '',
                    metadata: options.metadata || {}
                })
            });
        } catch (error) {
            throw new Error('Could not reach the local payment server. Start `npm start` and make sure it is running on http://localhost:4242.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Could not create the payment intent.');
        }

        if (!data.clientSecret) {
            throw new Error('Stripe client secret was not returned by the server.');
        }

        return data;
    }

    async function openPaymentModal(options) {
        ensureMarkup();
        await ensureRuntimeConfig();
        activePaymentOptions = options;
        setPaymentMessage('', '');

        document.getElementById('nexlancePaymentTitle').textContent = options.title || 'Complete your payment';
        document.getElementById('nexlancePaymentText').textContent = options.message || 'Enter your card details to finish checkout securely with Stripe.';
        document.getElementById('nexlancePaymentSummaryTitle').textContent = options.summaryTitle || 'Payment';
        document.getElementById('nexlancePaymentSummaryText').textContent = options.summaryText || 'Secure checkout';
        document.getElementById('nexlancePaymentAmount').textContent = formatAmount(options.amount, options.currency || config.currency);
        document.getElementById('nexlancePayNowBtn').textContent = options.buttonText || 'Pay now';

        const overlay = document.getElementById('nexlancePaymentOverlay');
        showOverlay(overlay);

        try {
            const [{ clientSecret }, stripe] = await Promise.all([
                createPaymentIntent(options),
                getStripeInstance()
            ]);

            if (paymentElement) {
                paymentElement.unmount();
                paymentElement = null;
            }

            elements = stripe.elements({ clientSecret });
            paymentElement = elements.create('payment');
            paymentElement.mount('#nexlancePaymentElement');
        } catch (error) {
            console.error('Payment modal setup failed:', error);
            setPaymentMessage(error.message || 'Could not start secure payment.', 'error');
        }
    }

    async function handlePaymentSubmit(event) {
        event.preventDefault();
        if (!activePaymentOptions) return;

        const payButton = document.getElementById('nexlancePayNowBtn');
        payButton.disabled = true;
        payButton.textContent = 'Processing...';
        setPaymentMessage('', '');

        try {
            const stripe = await getStripeInstance();

            if (!elements) {
                throw new Error('Stripe payment form is not ready. Start the local payment server and try again.');
            }

            const result = await stripe.confirmPayment({
                elements,
                redirect: 'if_required'
            });

            if (result.error) {
                throw new Error(result.error.message || 'Payment could not be completed.');
            }

            if (!result.paymentIntent || result.paymentIntent.status !== 'succeeded') {
                throw new Error('Payment was not completed.');
            }

            if (typeof activePaymentOptions.onSuccess === 'function') {
                await activePaymentOptions.onSuccess(result.paymentIntent);
            }

            setPaymentMessage(activePaymentOptions.successMessage || 'Payment completed successfully.', 'success');
            setTimeout(closePaymentModal, 700);
        } catch (error) {
            console.error('Payment submit failed:', error);
            setPaymentMessage(error.message || 'Payment could not be completed.', 'error');
        } finally {
            payButton.disabled = false;
            payButton.textContent = activePaymentOptions.buttonText || 'Pay now';
        }
    }

    function closePaymentModal() {
        const overlay = document.getElementById('nexlancePaymentOverlay');
        if (overlay) hideOverlay(overlay);
        if (paymentElement) {
            paymentElement.unmount();
            paymentElement = null;
        }
        elements = null;
        activePaymentOptions = null;
        setPaymentMessage('', '');
    }

    async function startBusinessCheckout(options) {
        const redirectTarget = (options && options.redirectTarget) || getCurrentPageWithQuery({ checkout: 'business' });

        if (!isLoggedIn()) {
            showAuthPrompt({
                title: 'Create an account or log in first',
                message: 'Please create your account or log in first. After that, the Business payment form will open automatically.',
                redirectTarget
            });
            return;
        }

        return openPaymentModal({
            amount: options.amount,
            currency: options.currency || config.currency,
            productCode: options.productCode || 'business_monthly',
            title: options.title || 'Upgrade to Business',
            message: options.message || 'Secure your Business plan with Stripe and unlock the full dashboard.',
            summaryTitle: options.summaryTitle || 'Business Plan',
            summaryText: options.summaryText || 'Full dashboard access',
            buttonText: options.buttonText || 'Pay for Business',
            description: options.description || 'Business plan upgrade',
            metadata: Object.assign({ flow: 'business_plan' }, options.metadata || {}),
            successMessage: options.successMessage || 'Business payment completed successfully.',
            onSuccess: options.onSuccess
        });
    }

    async function startTemplatePayment(options) {
        if (!isLoggedIn()) {
            showAuthPrompt({
                title: 'Log in to continue',
                message: 'Please log in first so we can attach this template payment to your account.',
                redirectTarget: getCurrentPageWithQuery()
            });
            return;
        }

        return openPaymentModal({
            amount: options.amount,
            currency: options.currency || config.currency,
            productCode: options.productCode || 'template_download',
            title: options.title || 'Pay before download',
            message: options.message || 'Complete this Stripe payment first, then your template files will download immediately.',
            summaryTitle: options.summaryTitle || options.templateName || 'Template Download',
            summaryText: options.summaryText || 'Single template purchase',
            buttonText: options.buttonText || 'Pay and Download',
            description: options.description || `Template purchase for ${options.templateName || 'template'}`,
            metadata: Object.assign({
                flow: 'template_download',
                template_id: options.templateId || '',
                template_name: options.templateName || ''
            }, options.metadata || {}),
            successMessage: options.successMessage || 'Template payment completed successfully.',
            onSuccess: options.onSuccess
        });
    }

    ensureMarkup();

    window.NexlancePayments = {
        isLoggedIn,
        showAuthPrompt,
        startBusinessCheckout,
        startTemplatePayment,
        closePaymentModal,
        getCurrentPageWithQuery
    };
})();
