import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import PosterCard from '../components/PosterCard';
import TagChip from '../components/TagChip';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';

const Recommendations = () => {
    const { isAuthenticated } = useAuth();
    const [recommendations, setRecommendations] = useState([]);
    const [basedOn, setBasedOn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecommendations();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchRecommendations = async () => {
        try {
            const response = await userAPI.getRecommendations();
            setRecommendations(response.data.recommendations || []);
            setBasedOn(response.data.basedOn);
            if (response.data.message) {
                setError(response.data.message);
            }
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
            setError('Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <h1 className="font-serif text-5xl text-gray-100 mb-6">
                        Sign in to discover
                    </h1>
                    <p className="text-muted text-lg mb-8">
                        Create an account to receive personalized film recommendations based on your taste.
                    </p>
                    <a
                        href="/login"
                        className="inline-block px-8 py-4 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen pt-24">
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20">
            <div className="max-w-[1800px] mx-auto px-8">
                {/* Header */}
                <div className="mb-16">
                    <h1 className="font-serif text-6xl text-gray-100 mb-4">For You</h1>
                    <p className="text-muted text-lg">
                        Personalized recommendations based on your cinematic preferences
                    </p>
                </div>

                {/* Taste Profile */}
                {basedOn && (
                    <div className="mb-16 p-10 bg-white/5 border border-white/10">
                        <h2 className="font-serif text-3xl text-gray-100 mb-6">
                            Your Taste Profile
                        </h2>
                        <p className="text-muted mb-6">
                            Analyzing <span className="text-accent-primary font-medium">{basedOn.favoredMoviesCount}</span> films you've favorited
                        </p>
                        {basedOn.tags && basedOn.tags.length > 0 && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-muted mb-4">
                                    Dominant Themes
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {basedOn.tags.map((tag, idx) => (
                                        <TagChip key={idx} tag={tag} isActive={true} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Recommendations Grid */}
                {error && recommendations.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted text-lg mb-6">{error}</p>
                        <a
                            href="/explore"
                            className="inline-block px-8 py-4 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors"
                        >
                            Explore Films
                        </a>
                    </div>
                ) : recommendations.length > 0 ? (
                    <div className="masonry-grid">
                        {recommendations.map((movie) => (
                            <div key={movie._id} className="relative hover:z-50">
                                <PosterCard movie={movie} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-muted text-lg">No recommendations yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Recommendations;
