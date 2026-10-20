const LoadingSkeleton = () => {
    return (
        <div className="flex justify-center items-center py-20">
            <div className="space-y-4 text-center">
                <div className="w-12 h-12 mx-auto border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
                <p className="font-label text-muted text-sm tracking-[0.14em] uppercase">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingSkeleton;
