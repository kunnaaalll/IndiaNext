/**
 * useScrollAnimation Hook
 * 
 * Hook for scroll-triggered animations using Intersection Observer.
 * Integrates with Framer Motion for smooth animations.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useAnimation, AnimationControls } from 'framer-motion';
import { useAnimationContext } from '../context/AnimationProvider';

export interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface ScrollAnimationReturn {
  ref: React.RefObject<HTMLElement>;
  isInView: boolean;
  controls: AnimationControls;
}

/**
 * Hook for scroll-triggered animations
 */
export const useScrollAnimation = (
  options: ScrollAnimationOptions = {}
): ScrollAnimationReturn => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -100px 0px',
    once = true,
    onEnter,
    onExit,
  } = options;

  const { reducedMotion } = useAnimationContext();
  const ref = useRef<HTMLElement>(null);
  const controls = useAnimation();
  const [hasAnimated, setHasAnimated] = useState(false);

  // Use Framer Motion's useInView hook
  const isInView = useInView(ref, {
    once: false, // We'll handle 'once' logic manually
    amount: threshold,
    margin: rootMargin,
  });

  useEffect(() => {
    if (isInView && (!once || !hasAnimated)) {
      // Element entered viewport
      controls.start('visible');
      setHasAnimated(true);
      onEnter?.();
    } else if (!isInView && !once && hasAnimated) {
      // Element exited viewport (only if once is false)
      controls.start('hidden');
      onExit?.();
    }
  }, [isInView, controls, once, hasAnimated, onEnter, onExit]);

  // If reduced motion is enabled, show content immediately
  useEffect(() => {
    if (reducedMotion) {
      controls.start('visible');
    }
  }, [reducedMotion, controls]);

  return {
    ref,
    isInView,
    controls,
  };
};
