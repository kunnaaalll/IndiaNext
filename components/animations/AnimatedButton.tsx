/**
 * AnimatedButton Component
 * 
 * Interactive button with hover, press, and focus animations.
 * Uses spring physics for smooth, natural feel.
 */

'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { useAnimationContext } from '@/lib/animations/context/AnimationProvider';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600',
  secondary: 'bg-gray-700 text-white hover:bg-gray-600',
  ghost: 'bg-transparent text-white border border-white/20 hover:bg-white/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const { config, reducedMotion } = useAnimationContext();

  const buttonClasses = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
    rounded-sm font-bold transition-colors
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim();

  // Animation variants
  const hoverScale = reducedMotion ? 1 : 1.05;
  const tapScale = reducedMotion ? 1 : 0.95;

  return (
    <motion.button
      className={buttonClasses}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      transition={{
        type: 'spring',
        stiffness: config.easing.spring.stiffness,
        damping: config.easing.spring.damping,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <motion.span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
};
