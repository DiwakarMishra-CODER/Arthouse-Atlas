import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';

/**
 * Your account, plainly: your name, who you're signed in as (and signing out), your password, and
 * deleting the account. Each row shows what it is and, on its right, what you can do with it
 * ("Change ›"), so it's plain at a glance what can be changed; changing opens the row up to write in.
 * Each change says what happened, or what's wrong, right where you made it.
 *
 * Set like a printed programme rather than a form: a field is a line of light serif on a hairline
 * rule, drawn in gold while you're writing on it.
 */

const say = (err) => err?.response?.data?.message || (err?.response ? 'Something went wrong. Try again.' : 'Couldn’t reach the atlas. Try again in a moment.');
const action = 'inline-flex items-center min-h-11 whitespace-nowrap font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase transition-colors';
const go = `${action} text-gold hover:text-gold-light disabled:text-gray-600 disabled:cursor-default`;
const quiet = `${action} text-gray-400 hover:text-white`;
const danger = `${action} text-[#e8a597] hover:text-[#f5bcae] disabled:text-gray-600 disabled:cursor-default`;

// a line to write on: light serif on a hairline, drawn in gold while you're in it
const Field = ({ big = false, className = '', ...props }) => (
    <span className={`relative block ${className}`}>
        <input
            {...props}
            className={`peer w-full min-w-0 bg-transparent border-0 border-b border-white/25 rounded-none px-0 pt-1 pb-2 outline-none font-serif font-light text-white caret-gold-light placeholder:text-gray-600 placeholder:italic [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#050505] [&:-webkit-autofill]:[-webkit-text-fill-color:#f1ece2] ${big ? 'text-[1.9rem] md:text-[2.4rem] leading-tight' : 'text-[1.3rem] md:text-[1.5rem]'}`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gold-light origin-left scale-x-0 transition-transform duration-300 peer-focus:scale-x-100" />
    </span>
);

// one setting: its name, what it is now, and (on the right) what you can do with it
const Row = ({ label, act, children }) => (
    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[11rem_1fr_auto] gap-x-6 md:gap-x-10 gap-y-2 py-7 border-t border-white/[0.08] items-start">
        <div className="col-span-2 md:col-span-1 font-label text-[12px] tracking-[0.18em] uppercase text-gray-400 md:pt-3">{label}</div>
        <div className="min-w-0">{children}</div>
        <div className="md:pt-1.5">{act}</div>
    </div>
);
const Note = ({ note }) => (note ? <p role="status" className={`chalk-in mt-3 font-serif italic text-[1.05rem] ${note.ok ? 'text-gold-light' : 'text-[#e8a597]'}`}>{note.text}</p> : null);
const Aside = ({ children }) => <p className="mt-2 font-serif italic text-[1.02rem] leading-snug text-gray-500">{children}</p>;
const Value = ({ big = false, children }) => (
    <p className={`font-serif font-light text-gray-100 break-words ${big ? 'text-[1.9rem] md:text-[2.4rem] leading-tight text-white' : 'text-[1.3rem] md:text-[1.5rem] md:pt-1'}`}>{children}</p>
);

const Account = ({ name, onRenamed }) => {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(null); // the row opened to write in: name · password · delete
    const [newName, setNewName] = useState(name);
    const [pw, setPw] = useState({ current: '', next: '' });
    const [confirm, setConfirm] = useState('');
    const [note, setNote] = useState({}); // row -> { ok, text }
    const [busy, setBusy] = useState('');

    const openRow = (row) => { setOpen(row); setNote({}); setNewName(name); setPw({ current: '', next: '' }); setConfirm(''); };
    const close = () => setOpen(null);
    const tell = (row, ok, text) => setNote({ [row]: { ok, text } });

    const rename = async (e) => {
        e.preventDefault();
        if (newName.trim() === name) { close(); return; }
        setBusy('name');
        try {
            const r = await userAPI.updateMe(newName.trim());
            onRenamed?.(r.data.username);
            refreshUser?.();
            close();
            tell('name', true, 'Saved. Your awards carry your new name.');
        } catch (err) { tell('name', false, say(err)); }
        setBusy('');
    };
    const changePassword = async (e) => {
        e.preventDefault();
        setBusy('password');
        try {
            await userAPI.changePassword(pw.current, pw.next);
            close();
            tell('password', true, 'Password changed.');
        } catch (err) { tell('password', false, say(err)); }
        setBusy('');
    };
    const deleteAccount = async (e) => {
        e.preventDefault();
        setBusy('delete');
        try {
            await userAPI.deleteMe(confirm);
            logout();
            navigate('/', { replace: true });
        } catch (err) { tell('delete', false, say(err)); setBusy(''); }
    };

    return (
        <section id="account" className="pt-20 md:pt-28 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="flex items-baseline gap-4">
                    <h2 className="font-serif font-light text-3xl md:text-5xl text-white">Your account</h2>
                    <span className="flex-1 h-px bg-white/10" />
                </div>
                <div className="mt-8 max-w-4xl">
                    <Row label="Your name" act={open !== 'name' && <button type="button" onClick={() => openRow('name')} className={go}>Change ›</button>}>
                        {open === 'name' ? (
                            <form onSubmit={rename} className="grid gap-4">
                                <Field big autoFocus aria-label="Your name" value={newName} onChange={(e) => { setNewName(e.target.value); setNote({}); }} autoComplete="username" spellCheck={false} />
                                <div className="flex items-center gap-8">
                                    <button type="submit" disabled={busy === 'name' || !newName.trim()} className={go}>{busy === 'name' ? 'Saving…' : 'Save ›'}</button>
                                    <button type="button" onClick={close} className={quiet}>Cancel</button>
                                </div>
                            </form>
                        ) : <Value big>{name}</Value>}
                        <Note note={note.name} />
                    </Row>

                    <Row label="Signed in as" act={<button type="button" onClick={() => { logout(); navigate('/'); }} className={go}>Sign out ›</button>}>
                        <Value>{user?.email || '—'}</Value>
                    </Row>

                    <Row label="Password" act={open !== 'password' && <button type="button" onClick={() => openRow('password')} className={go}>Change ›</button>}>
                        {open === 'password' ? (
                            <form onSubmit={changePassword} className="grid gap-6">
                                <Field type="password" autoFocus aria-label="Your current password" placeholder="Your current password" autoComplete="current-password" value={pw.current} onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); setNote({}); }} />
                                <Field type="password" aria-label="A new password" placeholder="A new one, 6 characters or more" autoComplete="new-password" value={pw.next} onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); setNote({}); }} />
                                <div className="flex items-center gap-8">
                                    <button type="submit" disabled={busy === 'password' || !pw.current || !pw.next} className={go}>{busy === 'password' ? 'Changing…' : 'Save ›'}</button>
                                    <button type="button" onClick={close} className={quiet}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <Value><span aria-label="Hidden" className="tracking-[0.25em] text-gray-500">••••••••</span></Value>
                                <Aside>Joined with Google? You don’t need one: keep signing in with Google.</Aside>
                            </>
                        )}
                        <Note note={note.password} />
                    </Row>

                    <Row label="Delete account" act={open !== 'delete' && <button type="button" onClick={() => openRow('delete')} className={danger}>Delete ›</button>}>
                        {open === 'delete' ? (
                            <form onSubmit={deleteAccount} className="grid gap-5">
                                <p className="font-serif text-[1.1rem] leading-snug text-gray-200">This deletes your account, with all your ratings, lists and awards. It can’t be undone. To confirm, type your name: <span className="text-white">{name}</span>.</p>
                                <Field autoFocus aria-label="Type your name to confirm" placeholder={name} value={confirm} onChange={(e) => { setConfirm(e.target.value); setNote({}); }} autoComplete="off" spellCheck={false} />
                                <div className="flex items-center gap-8">
                                    <button type="submit" disabled={busy === 'delete' || confirm !== name} className={danger}>{busy === 'delete' ? 'Deleting…' : 'Delete it for good ›'}</button>
                                    <button type="button" onClick={close} className={quiet}>Keep it</button>
                                </div>
                            </form>
                        ) : <Aside>Your ratings, lists and awards go with it.</Aside>}
                        <Note note={note.delete} />
                    </Row>
                </div>
            </div>
        </section>
    );
};

export default Account;
