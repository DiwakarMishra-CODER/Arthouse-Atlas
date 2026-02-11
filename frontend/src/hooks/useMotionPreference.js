import { useState, useEffect } from 'react';

/**
 * Custom hook to detect user's motion preference
 * 
 * Checks for 'prefers-reduced-motion' media query and returns boolean.
 * This is crucial for accessibility - users who enable reduced motion
 * (common for vestibular disorders, seizure prevention, etc.) should
 * see static content instead of animations.
 * 
 * @returns {boolean} True if user prefers reduced motion
 */
export function useMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported
    if (!window.matchMedia) {
      setPrefersReducedMotion(false);
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (modern API)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
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
