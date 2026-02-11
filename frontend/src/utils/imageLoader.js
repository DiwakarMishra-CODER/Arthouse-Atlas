/**
 * Image Loading Utilities for Cinematic Motion System
 * 
 * Provides helper functions for:
 * - Generating responsive TMDB image URLs
 * - Creating blur-up placeholders (LQIP)
 * - Preloading images for smooth transitions
 */

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Image size presets for different use cases
 */
export const IMAGE_SIZES = {
  CARD: 'w300',        // Movie cards in grid
  CARD_LARGE: 'w500',  // Featured cards
  HERO: 'w780',        // Hero sections
  HERO_LARGE: 'w1280', // Full-screen hero
  ORIGINAL: 'original' // Maximum quality
};

/**
 * Get optimized TMDB image URL for a given path and size
 * 
 * @param {string} tmdbPath - TMDB image path (e.g., '/abc123.jpg')
 * @param {string} size - Image size preset (default: 'w780')
 * @returns {string} Full TMDB image URL
 */
export function getOptimizedImageUrl(tmdbPath, size = IMAGE_SIZES.HERO) {
  if (!tmdbPath) return null;
  
  // If it's already a full URL, return as-is
  if (tmdbPath.startsWith('http')) {
    return tmdbPath;
  }
  
  // Ensure path starts with /
  const path = tmdbPath.startsWith('/') ? tmdbPath : `/${tmdbPath}`;
  
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Extract TMDB path from full URL
 * 
 * @param {string} url - Full TMDB URL
 * @returns {string} TMDB path or original URL
 */
export function extractTmdbPath(url) {
  if (!url) return null;
  
  // Extract path from TMDB URL
  const match = url.match(/\/t\/p\/[^/]+(\/.+)$/);
  return match ? match[1] : url;
}

/**
 * Generate a tiny base64 placeholder for blur-up effect
 * 
 * Note: This is a simple implementation. For production, consider:
 * - Server-side LQIP generation
 * - BlurHash or ThumbHash libraries
 * 
 * @param {string} imageUrl - Full image URL
 * @returns {Promise<string>} Base64 data URL
 */
export async function generateLQIP(imageUrl) {
  try {
    // For now, return a simple gray placeholder
    // In production, this should generate actual tiny images
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 15; // Maintain 2:3 aspect ratio
    
    const ctx = canvas.getContext('2d');
    
    // Simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, 0, 15);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0a0a0a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 15);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  } catch (error) {
    console.error('Error generating LQIP:', error);
    return null;
  }
}

/**
 * Preload images in the background
 * 
 * @param {string[]} imageUrls - Array of image URLs to preload
 * @returns {Promise<void[]>} Promise that resolves when all images are loaded
 */
export function preloadStills(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return Promise.resolve([]);
  }

  const preloadPromises = imageUrls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        resolve(null); // Resolve anyway to not block other images
      };
      
      img.src = url;
    });
  });

  return Promise.all(preloadPromises);
}

/**
 * Get responsive srcSet for an image
 * 
 * @param {string} tmdbPath - TMDB image path
 * @returns {string} srcSet string for responsive images
 */
export function getResponsiveSrcSet(tmdbPath) {
  if (!tmdbPath) return '';
  
  const path = extractTmdbPath(tmdbPath);
  
  return [
    `${getOptimizedImageUrl(path, IMAGE_SIZES.CARD)} 300w`,
    `${getOptimizedImageUrl(path, IMAGE_SIZES.CARD_LARGE)} 500w`,
    `${getOptimizedImageUrl(path, IMAGE_SIZES.HERO)} 780w`,
    `${getOptimizedImageUrl(path, IMAGE_SIZES.HERO_LARGE)} 1280w`
  ].join(', ');
}

/**
 * Check if an image URL is valid and loads successfully
 * 
 * @param {string} url - Image URL to validate
 * @returns {Promise<boolean>} True if image loads successfully
 */
export async function validateImageUrl(url) {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
