import Leader from './Leader';

// a page waiting for its film: the leader counting down, and what's coming in plain words
const LoadingSkeleton = ({ label = 'Loading' }) => (
    <div className="flex justify-center items-center py-20">
        <Leader label={label} />
    </div>
);

export default LoadingSkeleton;
