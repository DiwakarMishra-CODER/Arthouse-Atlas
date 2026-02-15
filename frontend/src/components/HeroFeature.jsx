import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HeroFeature = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Simple "Fake" load delay to mask the YouTube spinner
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000); // 2 seconds black screen, then fade in
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            {/* The Curtain (Masks the loading spinner) */}
            <div className={`absolute inset-0 bg-black z-10 pointer-events-none transition-opacity duration-1500 ease-in-out ${isVisible ? 'opacity-0' : 'opacity-100'}`} />

            {/* YouTube Video Background (z-0) - Using reliable iframe */}
            <div className={`absolute inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <iframe
                    className="absolute inset-0 w-full h-full scale-[1.35]"
                    src="https://www.youtube.com/embed/xBasQG_6p40?autoplay=1&mute=1&controls=0&loop=1&playlist=xBasQG_6p40&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&start=23&vq=hd1080"
                    title="Hero Background"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{ pointerEvents: 'none' }}
                />
            </div>

            {/* Gradient Overlay (z-10) - Sits on top of video, below text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

            {/* Static Brand Content (z-20) */}
            <div className="absolute bottom-8 md:bottom-12 left-0 w-full p-8 md:p-12 z-20 flex flex-col items-start">
                {/* Main Headline - Bigger Size */}
                <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/80 drop-shadow-2xl">
                    Cinema That <span className="italic text-accent-primary">Lingers</span>
                </h1>

                {/* Sub-headline */}
                <h2 className="font-sans text-lg md:text-xl lg:text-2xl text-gray-200 mt-3 md:mt-4 max-w-2xl leading-relaxed">
                    An antidote to the algorithm. Curated for the patient, the curious, and the obsessed
                </h2>

                {/* CTA Button */}
                <Link
                    to="/explore"
                    className="mt-4 md:mt-6 px-6 md:px-8 py-2 md:py-3 bg-white hover:bg-gray-200 transition-all duration-300 text-black tracking-widest uppercase text-xs font-semibold rounded-sm"
                >
                    Explore Collection
                </Link>
            </div>
        </div>
    );
};

export default HeroFeature;
