import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, setUser } = useAuth();
    const navigate = useNavigate();

    const handleGoogleSuccess = async (response) => {
        try {
            console.log("1. Google Popup Finished. Response:", response); // Debug Log

            // 1. Send Google Token to Backend
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/google`, {
                token: response.code || response.access_token
            });

            console.log("2. Backend Verified. User Data:", res.data); // Debug Log

            // 2. CRITICAL STEP: Save to Local Storage
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userInfo', JSON.stringify(res.data));

            // 3. Update Global State
            setUser(res.data);

            // 4. Navigate AFTER saving
            console.log("3. Saving complete. Navigating...");
            navigate('/');

        } catch (err) {
            console.error("Google Auth Failed:", err);
            setError(err.response?.data?.message || 'Google Signup Failed');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { confirmPassword, ...registerData } = formData;
            await register(registerData);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <h1 className="font-serif text-6xl text-gray-100 mb-4">
                        Join Atlas
                    </h1>
                    <p className="text-muted text-lg">
                        Begin your journey through arthouse cinema
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}




                    <div>
                        <label htmlFor="username" className="block text-sm uppercase tracking-wider text-muted mb-3">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50 rounded-xl"
                            placeholder="your_username"
                        />
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

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm uppercase tracking-wider text-muted mb-3">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-4 py-4 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50 rounded-xl pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                            >
                                <span className="material-icons-round text-xl">
                                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors disabled:opacity-50 rounded-xl"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-muted">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>

                <div className="mt-6">
                    <div className="flex items-center mb-6">
                        <div className="h-px bg-white/20 flex-1"></div>
                        <span className="px-4 text-gray-500 text-sm">OR</span>
                        <div className="h-px bg-white/20 flex-1"></div>
                    </div>

                    <GoogleAuthButton text="Sign up with Google" />
                </div>
            </div>
        </div>
    );
};

export default Register;
