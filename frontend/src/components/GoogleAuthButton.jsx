import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Sign in (or join) with Google. Google's popup hands back an access token, which the atlas trades for
 * its own (AuthContext.loginWithGoogle), so the page carries on signed in without a reload.
 * It wears Google's own look (white, the four-colour G, "Sign in with Google"), since that's what
 * people scan a sign-in page for.
 * onStart: the popup said yes and the atlas is being asked · onSignedIn(user) · onFailed(words)
 */
const GoogleAuthButton = ({ text = 'Continue with Google', onStart, onSignedIn, onFailed, className = '' }) => {
    const navigate = useNavigate();
    const { loginWithGoogle } = useAuth();

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            onStart?.();
            try {
                const user = await loginWithGoogle(tokenResponse.access_token);
                if (onSignedIn) onSignedIn(user);
                else navigate('/');
            } catch {
                onFailed?.('Google sign-in didn’t go through. Try again.');
            }
        },
        onError: () => onFailed?.('Google sign-in didn’t go through. Try again.'),
    });

    return (
        <button
            type="button"
            onClick={() => login()}
            className={`flex items-center justify-center gap-3 min-h-12 px-5 rounded-[4px] bg-[#ffffff] text-[#1f1f1f] ring-1 ring-[#dadce0] hover:bg-[#f2f2f2] transition-colors font-['Roboto',system-ui,sans-serif] text-[15px] md:text-[16px] font-medium tracking-normal normal-case ${className}`}
        >
            <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {text}
        </button>
    );
};

export default GoogleAuthButton;
