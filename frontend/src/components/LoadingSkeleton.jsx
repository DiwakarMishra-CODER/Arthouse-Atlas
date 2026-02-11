const LoadingSkeleton = () => {
    return (
        <div className="flex justify-center items-center py-20">
            <div className="space-y-4 text-center">
                <div className="w-12 h-12 mx-auto border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin"></div>
                <p className="text-muted text-sm tracking-wide uppercase">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingSkeleton;
