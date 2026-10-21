/**
 * The checks on a member's own account changes (Profile: Your account), in plain words. Each returns
 * what's wrong, or null.
 */

export const nameProblem = (name) => {
    const n = (name || '').trim();
    if (n.length < 3) return 'A name needs 3 letters or more.';
    if (n.length > 30) return 'A name can be 30 letters at most.';
    if (!/^[\p{L}\p{N} ._'-]+$/u.test(n)) return 'A name can have letters, numbers, spaces and . _ \' - only.';
    return null;
};

export const passwordProblem = ({ current, next }) => {
    if (!current) return 'Type your current password.';
    if (!next || next.length < 6) return 'A new password needs 6 characters or more.';
    if (next === current) return 'That’s the password you have now.';
    return null;
};

// deleting an account is confirmed by typing its name, exactly
export const deleteProblem = ({ confirm, username }) => (confirm === username ? null : 'Type your name exactly as it is, to confirm.');
