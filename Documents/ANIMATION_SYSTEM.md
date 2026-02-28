# Animation System Documentation

## Overview

The IndiaNext Animation System provides a comprehensive, performant, and accessible animation framework built on Framer Motion and Tailwind CSS. The system is designed to enhance user experience while maintaining 60fps performance and respecting user accessibility preferences.

## Features

- ✨ Smooth, GPU-accelerated animations
- ♿ Built-in accessibility support (prefers-reduced-motion)
- 📊 Performance monitoring and optimization
- 🎨 Consistent animation timing and easing
- 🧩 Reusable components and hooks
- 📱 Mobile-optimized animations
- 🧪 Test-friendly with test mode support

## Installation

The animation system is already integrated into the application. No additional installation required.

## Quick Start

### 1. Basic Usage

The AnimationProvider is already set up in `app/layout.tsx`. All pages and components have access to the animation system.

```tsx
import { ScrollReveal, AnimatedButton } from '@/components/animations';

export default function MyPage() {
  return (
    <div>
      <ScrollReveal variant="fadeInUp">
        <h1>Welcome to IndiaNext</h1>
      </ScrollReveal>

      <AnimatedButton variant="primary" size="lg">
        Register Now
      </AnimatedButton>
    </div>
  );
}
```

### 2. Using Hooks

```tsx
'use client';

import { useScrollAnimation, useReducedMotion } from '@/lib/animations';
import { motion } from 'framer-motion';

export function MyComponent() {
  const { ref, isInView } = useScrollAnimation();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      Content appears when scrolled into view
    </motion.div>
  );
}
```

## Components

### PageTransition

Smooth transitions between pages.

```tsx
import { PageTransition } from '@/components/animations';

<PageTransition variant="fade" duration={300}>
  <YourPageContent />
</PageTransition>
```

**Props:**
- `variant`: 'fade' | 'slide' | 'scale' (default: 'fade')
- `duration`: number in milliseconds (default: 300)

### ScrollReveal

Reveals content when it enters the viewport.

```tsx
import { ScrollReveal } from '@/components/animations';

<ScrollReveal variant="fadeInUp" delay={0.2} once={true}>
  <YourContent />
</ScrollReveal>
```

**Props:**
- `variant`: 'fadeIn' | 'fadeInUp' | 'fadeInLeft' | 'fadeInRight'
- `delay`: number in seconds (default: 0)
- `once`: boolean - animate only once (default: true)

### AnimatedButton

Interactive button with hover and press effects.

```tsx
import { AnimatedButton } from '@/components/animations';

<AnimatedButton 
  variant="primary" 
  size="lg"
  loading={isLoading}
  onClick={handleClick}
>
  Click Me
</AnimatedButton>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean - shows loading spinner
- All standard button props

### AnimatedCard

Card with hover elevation effect.

```tsx
import { AnimatedCard } from '@/components/animations';

<AnimatedCard onClick={handleClick}>
  <YourCardContent />
</AnimatedCard>
```

### SkeletonScreen

Loading skeletons with shimmer effect.

```tsx
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/animations';

// Basic skeleton
<Skeleton variant="text" width="80%" />

// Preset card skeleton
<SkeletonCard />

// List of skeletons
<SkeletonList count={5} />
```

**Props:**
- `variant`: 'text' | 'circular' | 'rectangular' | 'card'
- `width`: string | number
- `height`: string | number
- `count`: number - for multiple skeletons

### FormValidation

Form validation animations.

```tsx
import { FormValidation, AnimatedField } from '@/components/animations';

<AnimatedField error={hasError}>
  <input type="text" />
</AnimatedField>

<FormValidation 
  error={errorMessage}
  success={successMessage}
  show={showMessage}
/>
```

### StaggerList

Staggered animations for list items.

```tsx
import { StaggerList } from '@/components/animations';

<StaggerList staggerDelay={50}>
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</StaggerList>
```

**Props:**
- `staggerDelay`: number in milliseconds (default: 50)
- `variant`: 'fadeIn' | 'slideIn'

## Hooks

### useReducedMotion

Detects if user prefers reduced motion.

```tsx
import { useReducedMotion } from '@/lib/animations';

const reducedMotion = useReducedMotion();

if (reducedMotion) {
  // Show content without animation
}
```

### useScrollAnimation

Hook for scroll-triggered animations.

```tsx
import { useScrollAnimation } from '@/lib/animations';

const { ref, isInView, controls } = useScrollAnimation({
  threshold: 0.1,
  once: true,
  onEnter: () => console.log('Entered viewport'),
});
```

**Options:**
- `threshold`: number (0-1) - percentage of element visible
- `rootMargin`: string - margin before triggering
- `once`: boolean - trigger only once
- `onEnter`: callback when entering viewport
- `onExit`: callback when exiting viewport

### usePerformance

Monitor animation performance.

```tsx
import { usePerformance } from '@/lib/animations';

const { metrics, startMonitoring, stopMonitoring } = usePerformance();

// Start monitoring
startMonitoring();

// Check metrics
console.log(metrics.fps); // Current FPS
console.log(metrics.droppedFrames); // Number of dropped frames

// Stop monitoring
stopMonitoring();
```

### useAnimationContext

Access global animation configuration.

```tsx
import { useAnimationContext } from '@/lib/animations';

const { config, reducedMotion, testMode } = useAnimationContext();
```

## Configuration

### Animation Durations

```typescript
config.duration.instant    // 0ms
config.duration.fast       // 150ms
config.duration.normal     // 300ms
config.duration.slow       // 500ms
config.duration.verySlow   // 800ms
```

### Easing Functions

```typescript
config.easing.linear       // 'linear'
config.easing.easeIn       // 'cubic-bezier(0.4, 0, 1, 1)'
config.easing.easeOut      // 'cubic-bezier(0, 0, 0.2, 1)'
config.easing.easeInOut    // 'cubic-bezier(0.4, 0, 0.2, 1)'
config.easing.spring       // { stiffness: 300, damping: 20 }
```

### Stagger Delays

```typescript
config.stagger.fast        // 30ms
config.stagger.normal      // 50ms
config.stagger.slow        // 100ms
```

## Accessibility

The animation system automatically respects the `prefers-reduced-motion` media query. When a user has reduced motion enabled:

- All animations are disabled or significantly reduced
- Content appears instantly
- Essential animations (like loading indicators) are preserved
- Keyboard navigation remains fully functional

## Performance Best Practices

### 1. Use GPU-Accelerated Properties

✅ Good:
```tsx
<motion.div animate={{ opacity: 1, transform: 'translateY(0)' }} />
```

❌ Avoid:
```tsx
<motion.div animate={{ top: 0, left: 0 }} />
```

### 2. Limit Concurrent Animations

The system automatically limits concurrent animations on mobile devices. For custom animations, be mindful of performance.

### 3. Use `will-change` Sparingly

The system manages `will-change` automatically. Only add it manually for critical animations.

### 4. Lazy Load Heavy Animations

```tsx
import dynamic from 'next/dynamic';

const HeavyAnimation = dynamic(
  () => import('@/components/animations/HeavyAnimation'),
  { ssr: false }
);
```

## Testing

### Test Mode

Enable test mode to disable animation durations for faster tests:

```tsx
<AnimationProvider testMode={true}>
  <YourComponent />
</AnimationProvider>
```

### Testing with Reduced Motion

```tsx
import { render } from '@testing-library/react';

// Mock reduced motion
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});
```

## Troubleshooting

### Animations Not Working

1. Ensure AnimationProvider is wrapping your app
2. Check that components are client-side ('use client' directive)
3. Verify Framer Motion is installed

### Performance Issues

1. Check FPS using usePerformance hook
2. Reduce number of concurrent animations
3. Use simpler animation variants
4. Enable reduced motion for testing

### TypeScript Errors

1. Ensure all animation types are imported
2. Check that props match component interfaces
3. Verify Framer Motion types are installed

## Examples

### Hero Section with Staggered Animation

```tsx
import { ScrollReveal, StaggerList, AnimatedButton } from '@/components/animations';

export function HeroSection() {
  return (
    <ScrollReveal variant="fadeInUp">
      <h1>Welcome to IndiaNext</h1>
      
      <StaggerList staggerDelay={100}>
        <p>24-hour hackathon</p>
        <p>₹1 Lakh+ prizes</p>
        <p>100 elite teams</p>
      </StaggerList>

      <AnimatedButton variant="primary" size="lg">
        Register Now
      </AnimatedButton>
    </ScrollReveal>
  );
}
```

### Loading State with Skeleton

```tsx
import { SkeletonCard } from '@/components/animations';

export function DataCard({ data, loading }) {
  if (loading) {
    return <SkeletonCard />;
  }

  return <div>{data.content}</div>;
}
```

### Form with Validation Animation

```tsx
import { AnimatedField, FormValidation } from '@/components/animations';

export function LoginForm() {
  const [error, setError] = useState('');

  return (
    <form>
      <AnimatedField error={!!error}>
        <input type="email" />
      </AnimatedField>

      <FormValidation 
        error={error}
        show={!!error}
      />
    </form>
  );
}
```

## API Reference

For detailed API documentation, see the TypeScript interfaces in:
- `lib/animations/config.ts`
- `lib/animations/variants.ts`
- `lib/animations/hooks/*`
- `components/animations/*`

## Support

For issues or questions about the animation system:
1. Check this documentation
2. Review the implementation in the codebase
3. Check browser console for performance warnings
4. Test with reduced motion enabled

## Future Enhancements (Phase 2)

Planned features for future releases:
- Parallax scrolling effects
- Gesture-based animations
- 3D transform animations
- Advanced scroll-linked animations
- More preset animation patterns
