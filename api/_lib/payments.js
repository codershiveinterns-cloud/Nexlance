const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const DEFAULT_CURRENCY = 'eur';

const PRODUCT_CATALOG = {
    business_monthly: {
        amount: 39900,
        currency: DEFAULT_CURRENCY,
        description: 'Nexlance Business plan upgrade (monthly)'
    },
    business_annual: {
        amount: 383040,
        currency: DEFAULT_CURRENCY,
        description: 'Nexlance Business plan upgrade (annual)'
    },
    template_download: {
        amount: 19900,
        currency: DEFAULT_CURRENCY,
        description: 'Nexlance template download'
    }
};

function getPaymentConfig() {
    return {
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        currency: DEFAULT_CURRENCY,
        products: Object.fromEntries(
            Object.entries(PRODUCT_CATALOG).map(([code, product]) => [
                code,
                { amount: product.amount, currency: product.currency }
            ])
        )
    };
}

async function createStripePaymentIntent(body) {
    if (!STRIPE_SECRET_KEY) {
        throw new Error('Set STRIPE_SECRET_KEY in your environment before starting the payment server.');
    }

    const productCode = String(body.productCode || '').trim();
    const product = PRODUCT_CATALOG[productCode];

    if (!product) {
        throw new Error('Invalid product selected for payment.');
    }

    const params = new URLSearchParams();
    params.set('amount', String(product.amount));
    params.set('currency', product.currency);
    params.set('automatic_payment_methods[enabled]', 'true');
    params.set('description', String(body.description || product.description));

    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    params.set('metadata[product_code]', productCode);
    Object.keys(metadata).forEach(key => {
        params.set(`metadata[${key}]`, String(metadata[key]));
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
        const message = data && data.error && data.error.message ? data.error.message : 'Stripe request failed.';
        throw new Error(message);
    }

    return {
        clientSecret: data.client_secret,
        paymentIntentId: data.id,
        amount: product.amount,
        currency: product.currency,
        productCode
    };
}

module.exports = {
    DEFAULT_CURRENCY,
    PRODUCT_CATALOG,
    getPaymentConfig,
    createStripePaymentIntent
};
