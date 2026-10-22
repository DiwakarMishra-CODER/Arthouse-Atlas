import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, passwordProblem, deleteProblem, googleProblem } from '../services/account.js';

test('a name: 3 to 30 letters, numbers, spaces and a few marks, in any alphabet', () => {
    assert.equal(nameProblem('Agnès'), null);
    assert.equal(nameProblem('  Zoë K.  '), null);
    assert.equal(nameProblem('黒澤明ファン'), null);
    assert.match(nameProblem('ab'), /3 letters/);
    assert.match(nameProblem('x'.repeat(31)), /30 letters/);
    assert.match(nameProblem('<script>'), /letters, numbers/);
});

test('a new password: the current one first, 6 characters or more, and not the same', () => {
    assert.equal(passwordProblem({ current: 'old-one', next: 'new-one' }), null);
    assert.match(passwordProblem({ current: '', next: 'new-one' }), /current password/);
    assert.match(passwordProblem({ current: 'old-one', next: 'short' }), /6 characters/);
    assert.match(passwordProblem({ current: 'same-one', next: 'same-one' }), /have now/);
});

test('deleting is confirmed by the name, exactly', () => {
    assert.equal(deleteProblem({ confirm: 'Agnès', username: 'Agnès' }), null);
    assert.ok(deleteProblem({ confirm: 'agnès', username: 'Agnès' }));
    assert.ok(deleteProblem({ confirm: undefined, username: 'Agnès' }));
});

test('a Google sign-in: only tokens issued to this site, for a verified email', () => {
    const ours = 'atlas.apps.googleusercontent.com';
    const info = { aud: ours, email: 'viewer@example.com', email_verified: 'true' };
    assert.equal(googleProblem(info, ours), null);
    assert.equal(googleProblem({ ...info, email_verified: true }, ours), null);
    assert.match(googleProblem({ ...info, aud: 'another-app.apps.googleusercontent.com' }, ours), /another site/);
    assert.match(googleProblem({ ...info, email_verified: 'false' }, ours), /isn’t verified/);
    assert.match(googleProblem({ ...info, email: undefined }, ours), /isn’t verified/);
    assert.match(googleProblem(info, undefined), /isn’t set up/);
    assert.match(googleProblem(null, ours), /another site/);
});
