import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, passwordProblem, deleteProblem } from '../services/account.js';

test('a name: 3 to 30 letters, numbers, spaces and a few marks, in any alphabet', () => {
    assert.equal(nameProblem('Shweta'), null);
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
    assert.equal(deleteProblem({ confirm: 'Shweta', username: 'Shweta' }), null);
    assert.ok(deleteProblem({ confirm: 'shweta', username: 'Shweta' }));
    assert.ok(deleteProblem({ confirm: undefined, username: 'Shweta' }));
});
