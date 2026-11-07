import { useState, useEffect, useSyncExternalStore } from 'react';

// One media query for the whole app, made on first use.
let reduceQuery;
const reduceMedia = () => {
  if (reduceQuery === undefined) {
    reduceQuery = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  }
  return reduceQuery;
};

function subscribeReduce(onChange) {
  const mq = reduceMedia();
  if (!mq) return () => {};
  if (mq.addEventListener) {
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }
  mq.addListener(onChange); // older Safari
  return () => mq.removeListener(onChange);
}

const reduceNow = () => reduceMedia()?.matches ?? false;

/**
 * Custom hook to detect user's motion preference
 *
 * Checks for 'prefers-reduced-motion' media query and returns boolean.
 * This is crucial for accessibility - users who enable reduced motion
 * (common for vestibular disorders, seizure prevention, etc.) should
 * see static content instead of animations.
 *
 * Read as an external store, so the very first render already has the right
 * answer (an effect used to set it after paint, so a reduced-motion visitor
 * got one frame that thought motion was fine).
 *
 * @returns {boolean} True if user prefers reduced motion
 */
export function useMotionPreference() {
  return useSyncExternalStore(subscribeReduce, reduceNow, () => false);
}

/**
 * Hook to detect if an element is visible in the viewport
 * Uses IntersectionObserver for performance
 * 
 * @param {RefObject} ref - React ref to the element to observe
 * @param {Object} options - IntersectionObserver options
 * @returns {boolean} True if element is intersecting viewport
 */
export function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}
