import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigins, corsOptions, stripOperators } from '../middleware/security.js';

const lets = (options, origin) => new Promise(done => options.origin(origin, (err, ok) => done(ok)));

test('the site and local servers may call the API from a browser; other sites may not', async () => {
    const options = corsOptions(allowedOrigins({}));
    assert.equal(await lets(options, 'https://arthouse-atlas.vercel.app'), true);
    assert.equal(await lets(options, 'http://localhost:5173'), true);
    assert.equal(await lets(options, 'http://localhost:5175'), true);
    assert.equal(await lets(options, 'http://127.0.0.1:4173'), true);
    assert.equal(await lets(options, 'http://localhost.evil.example'), false);
    assert.equal(await lets(options, 'https://evil.example'), false);
    assert.equal(await lets(options, 'https://arthouse-atlas.vercel.app.evil.example'), false);
});

test('requests with no Origin (UptimeRobot, curl) are not browser pages, so they pass', async () => {
    assert.equal(await lets(corsOptions(allowedOrigins({})), undefined), true);
});

test('CORS_ORIGINS replaces the list', () => {
    assert.deepEqual(allowedOrigins({ CORS_ORIGINS: 'https://a.example, https://b.example' }), ['https://a.example', 'https://b.example']);
    assert.ok(allowedOrigins({ CORS_ORIGINS: ' ' }).includes('https://arthouse-atlas.vercel.app'));
});

test('MongoDB operators and dotted keys never reach a query', () => {
    assert.deepEqual(stripOperators({ email: { $ne: null }, password: 'x' }), { email: {}, password: 'x' });
    assert.deepEqual(stripOperators({ 'ratings.movie': 1, keep: [{ $gt: '' , ok: 1 }] }), { keep: [{ ok: 1 }] });
    assert.deepEqual(stripOperators({ q: 'Bong Joon-ho', page: '2' }), { q: 'Bong Joon-ho', page: '2' });
    assert.equal(stripOperators('$plain string values are fine'), '$plain string values are fine');
});
