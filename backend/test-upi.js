const http = require('http');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'test-upi-results.json');
let logs = [];
const log = (...args) => {
    const msg = args.join(' ');
    console.log(msg);
    logs.push(msg);
};

const request = (url, options = {}, body = null) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 80,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function test() {
    try {
        log('1. Logging in user "harsh@123gmail.com"...');
        const loginRes = await request('http://localhost:3000/api/v1/auth/login', { method: 'POST' }, {
            email: 'harsh@123gmail.com',
            password: '123456Ab@'
        });

        if (loginRes.status !== 200) {
            log('Login failed: ' + JSON.stringify(loginRes.body));
            fs.writeFileSync(logFile, JSON.stringify({ success: false, error: 'Login failed', details: loginRes.body, logs }, null, 2));
            return;
        }

        const { token, user } = loginRes.body;
        log('Login successful! User ID: ' + user.id);

        log('\n2. Fetching current cart...');
        const headers = { Authorization: `Bearer ${token}` };
        const cartRes = await request('http://localhost:3000/api/v1/cart', { headers });
        log('Cart Items before order: ' + JSON.stringify(cartRes.body.data?.cart_items));

        if (!cartRes.body.data?.cart_items || cartRes.body.data.cart_items.length === 0) {
            log('Cart is empty. Adding item...');
            const addRes = await request('http://localhost:3000/api/v1/cart/items', { method: 'POST', headers }, {
                product_id: 'B00N1U9AJS',
                quantity: 2
            });
            log('Add to cart response: ' + JSON.stringify(addRes.body));
        }

        const cartUpdatedRes = await request('http://localhost:3000/api/v1/cart', { headers });
        const cartItems = cartUpdatedRes.body.data.cart_items;
        log('Cart Items to purchase: ' + JSON.stringify(cartItems));

        log('\n3. Placing UPI Order...');
        const payload = {
            shipping_address: {
                full_name: 'Harsh Prajapati',
                phone: '9714672225',
                address_line1: '10, Vihal nagar society',
                city: 'Nadiad',
                state: 'Gujarat',
                postal_code: '387002',
                type: 'home'
            },
            billing_address: {
                full_name: 'Harsh Prajapati',
                phone: '9714672225',
                address_line1: '10, Vihal nagar society',
                city: 'Nadiad',
                state: 'Gujarat',
                postal_code: '387002',
                type: 'home'
            },
            payment_method: 'upi',
            items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
        };

        const orderRes = await request('http://localhost:3000/api/v1/orders', { method: 'POST', headers }, payload);
        log('Order creation status: ' + orderRes.status + ' Body: ' + JSON.stringify(orderRes.body));

        if (orderRes.status !== 201) {
            log('Order creation failed!');
            fs.writeFileSync(logFile, JSON.stringify({ success: false, error: 'Order creation failed', status: orderRes.status, body: orderRes.body, logs }, null, 2));
            return;
        }

        const orderId = orderRes.body.data.id;
        log('Order created successfully with ID: ' + orderId);

        log('\n4. Verifying cart is cleared after order...');
        const cartFinalRes = await request('http://localhost:3000/api/v1/cart', { headers });
        const itemsCount = cartFinalRes.body.data?.cart_items?.length || 0;
        log('Cart items count after order: ' + itemsCount);
        let cartCleared = itemsCount === 0;

        log('\n5. Retrying fetch of the created order by ID...');
        const orderGetRes = await request(`http://localhost:3000/api/v1/orders/${orderId}`, { headers });
        log('Order response from GET: ' + JSON.stringify(orderGetRes.body));
        let paymentMethodPersisted = orderGetRes.body.data && orderGetRes.body.data.payment_method === 'upi';

        const success = cartCleared && paymentMethodPersisted;
        fs.writeFileSync(logFile, JSON.stringify({
            success,
            cartCleared,
            paymentMethodPersisted,
            order: orderGetRes.body,
            logs
        }, null, 2));
        log('Done. Success: ' + success);
    } catch (err) {
        log('Test script error: ' + err.message);
        fs.writeFileSync(logFile, JSON.stringify({ success: false, error: err.message, stack: err.stack, logs }, null, 2));
    }
}

test();
