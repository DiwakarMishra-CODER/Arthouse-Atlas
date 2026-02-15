import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <h1 className="font-serif text-6xl text-gray-100 mb-4">
                        Welcome Back
                    </h1>
                    <p className="text-muted text-lg">
                        Sign in to continue your cinematic journey
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}


                    <GoogleAuthButton text="Sign in with Google" />

                    <div className="flex items-center my-4">
                        <div className="h-px bg-white/20 flex-1"></div>
                        <span className="px-4 text-gray-500 text-sm">OR</span>
                        <div className="h-px bg-white/20 flex-1"></div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm uppercase tracking-wider text-muted mb-3">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50 rounded-xl"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm uppercase tracking-wider text-muted mb-3">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-4 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50 rounded-xl pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                            >
                                <span className="material-icons-round text-xl">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors disabled:opacity-50 rounded-xl"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="text-center text-muted">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-accent-primary hover:underline">
                            Join now
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
