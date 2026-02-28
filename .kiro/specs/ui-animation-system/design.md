# Design Document

## Introduction

This document outlines the technical design for the UI/UX Animation Enhancement System for the IndiaNext hackathon website. The system provides a centralized, performant, and accessible animation framework using Framer Motion and Tailwind CSS utilities. The design focuses on Phase 1 core animations while maintaining extensibility for future enhancements.

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (Pages, Components using animation utilities)              │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Animation System Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Hooks      │  │  Components  │  │   Utilities  │     │
│  │              │  │              │  │              │     │
│  │ useAnimation │  │ PageTransition│ │ AnimationConfig│   │
│  │ useScroll    │  │ SkeletonScreen│ │ Performance   │   │
│  │ useReduced   │  │ AnimatedCard  │ │ Monitoring    │   │
│  │   Motion     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│           Animation Provider Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AnimationContext (Global Configuration & State)     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Core Libraries                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Framer Motion│  │ Tailwind CSS │  │ Browser APIs │     │
│  │              │  │              │  │              │     │
│  │ - Animations │  │ - Utilities  │  │ - Intersection│    │
│  │ - Variants   │  │ - Transitions│  │   Observer    │    │
│  │ - Gestures   │  │              │  │ - Performance │    │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
lib/
├── animations/
│   ├── config.ts              # Central animation configuration
│   ├── variants.ts            # Reusable animation variants
│   ├── hooks/
│   │   ├── useAnimation.ts    # Core animation hook
│   │   ├── useScrollAnimation.ts  # Scroll-triggered animations
│   │   ├── useReducedMotion.ts    # Accessibility hook
│   │   └── usePerformance.ts      # Performance monitoring
│   ├── utils/
│   │   ├── performance.ts     # Performance utilities
│   │   ├── viewport.ts        # Viewport observer utilities
│   │   └── test-helpers.ts    # Testing utilities
│   └── context/
│       └── AnimationProvider.tsx  # Global animation context

components/
├── animations/
│   ├── PageTransition.tsx     # Page transition wrapper
│   ├── ScrollReveal.tsx       # Scroll-triggered reveal
│   ├── AnimatedButton.tsx     # Interactive button
│   ├── AnimatedCard.tsx       # Card with hover effects
│   ├── SkeletonScreen.tsx     # Loading skeleton
│   ├── FormValidation.tsx     # Form validation animations
│   └── StaggerList.tsx        # Staggered list animations

app/
└── layout.tsx                 # Wrap with AnimationProvider
```

## Component Design

### 1. Animation Configuration System

**File:** `lib/animations/config.ts`

```typescript
export interface AnimationConfig {
  duration: {
    instant: number;      // 0ms
    fast: number;         // 150ms
    normal: number;       // 300ms
    slow: number;         // 500ms
    verySlow: number;     // 800ms
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    spring: { stiffness: number; damping: number };
  };
  stagger: {
    fast: number;         // 30ms
    normal: number;       // 50ms
    slow: number;         // 100ms
  };
  viewport: {
    margin: string;       // "0px 0px -100px 0px"
    once: boolean;        // true
  };
}

export const animationConfig: AnimationConfig;
export const getAnimationDuration: (key: keyof AnimationConfig['duration']) => number;
export const validateConfig: (config: Partial<AnimationConfig>) => boolean;
```

**Design Decisions:**
- Centralized configuration for consistency
- TypeScript types for type safety
- Validation function for runtime checks
- Extensible structure for future additions

### 2. Animation Variants System

**File:** `lib/animations/variants.ts`

```typescript
import { Variants } from 'framer-motion';

export const fadeIn: Variants;
export const fadeInUp: Variants;
export const fadeInDown: Variants;
export const fadeInLeft: Variants;
export const fadeInRight: Variants;
export const scaleIn: Variants;
export const slideIn: Variants;
export const staggerContainer: Variants;
export const staggerItem: Variants;

// Utility to create custom variants
export const createVariant: (config: VariantConfig) => Variants;
```

**Design Decisions:**
- Predefined variants for common patterns
- Factory function for custom variants
- Consistent naming convention
- Reduced motion variants included

### 3. Animation Provider (Context)

**File:** `lib/animations/context/AnimationProvider.tsx`

```typescript
interface AnimationContextValue {
  config: AnimationConfig;
  reducedMotion: boolean;
  testMode: boolean;
  performance: PerformanceMetrics;
  updateConfig: (config: Partial<AnimationConfig>) => void;
}

export const AnimationProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<AnimationConfig>;
  testMode?: boolean;
}>;

export const useAnimationContext: () => AnimationContextValue;
```

**Design Decisions:**
- React Context for global state
- Automatic reduced motion detection
- Test mode support
- Performance metrics tracking
- Configuration override capability

### 4. Core Hooks

#### useReducedMotion Hook

**File:** `lib/animations/hooks/useReducedMotion.ts`

```typescript
export const useReducedMotion: () => boolean;
```

**Implementation:**
- Uses `matchMedia('(prefers-reduced-motion: reduce)')`
- Updates on preference change
- Returns boolean flag

#### useScrollAnimation Hook

**File:** `lib/animations/hooks/useScrollAnimation.ts`

```typescript
interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

export const useScrollAnimation: (
  options?: ScrollAnimationOptions
) => {
  ref: React.RefObject<HTMLElement>;
  isInView: boolean;
  controls: AnimationControls;
};
```

**Implementation:**
- Uses Intersection Observer API
- Framer Motion's `useInView` hook
- Configurable thresholds and margins
- Callback support for custom logic

#### usePerformance Hook

**File:** `lib/animations/hooks/usePerformance.ts`

```typescript
interface PerformanceMetrics {
  fps: number;
  averageFrameTime: number;
  minFrameTime: number;
  maxFrameTime: number;
  droppedFrames: number;
}

export const usePerformance: () => {
  metrics: PerformanceMetrics;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  reset: () => void;
};
```

**Implementation:**
- Uses Performance API
- Tracks frame rate during animations
- Logs warnings for poor performance
- Provides metrics for debugging

### 5. Animation Components

#### PageTransition Component

**File:** `components/animations/PageTransition.tsx`

```typescript
interface PageTransitionProps {
  children: React.ReactNode;
  variant?: 'fade' | 'slide' | 'scale';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps>;
```

**Implementation:**
- Wraps page content
- Animates on route change
- Uses Next.js App Router compatibility
- Prevents navigation during transition

#### ScrollReveal Component

**File:** `components/animations/ScrollReveal.tsx`

```typescript
interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: 'fadeIn' | 'fadeInUp' | 'fadeInLeft' | 'fadeInRight';
  delay?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps>;
```

**Implementation:**
- Uses `useScrollAnimation` hook
- Applies animation when in viewport
- Respects reduced motion preference
- Configurable animation variants

#### AnimatedButton Component

**File:** `components/animations/AnimatedButton.tsx`

```typescript
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps>;
```

**Implementation:**
- Hover scale effect (1.05x)
- Press effect (0.95x)
- Focus ring animation
- Loading state with spinner
- Spring physics for smooth feel

#### AnimatedCard Component

**File:** `components/animations/AnimatedCard.tsx`

```typescript
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps>;
```

**Implementation:**
- Hover elevation effect
- Translate up 4px on hover
- Shadow transition
- Respects reduced motion

#### SkeletonScreen Component

**File:** `components/animations/SkeletonScreen.tsx`

```typescript
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps>;
export const SkeletonCard: React.FC;
export const SkeletonList: React.FC<{ count: number }>;
```

**Implementation:**
- Shimmer animation effect
- Multiple variant types
- Configurable dimensions
- Fade out on content load

#### FormValidation Component

**File:** `components/animations/FormValidation.tsx`

```typescript
interface FormValidationProps {
  error?: string;
  success?: string;
  show: boolean;
}

export const FormValidation: React.FC<FormValidationProps>;
export const useFormAnimation: () => {
  shake: () => void;
  showSuccess: () => void;
  showError: (message: string) => void;
};
```

**Implementation:**
- Shake animation for errors
- Slide down for messages
- Color-coded feedback
- Staggered multi-field errors

#### StaggerList Component

**File:** `components/animations/StaggerList.tsx`

```typescript
interface StaggerListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  variant?: 'fadeIn' | 'slideIn';
}

export const StaggerList: React.FC<StaggerListProps>;
```

**Implementation:**
- Stagger children animations
- Configurable delay
- Maximum 20 items for performance
- Respects reduced motion

## Data Flow

### Animation Lifecycle

```
1. Component Mount
   ↓
2. AnimationProvider initializes
   ↓
3. Detect reduced motion preference
   ↓
4. Load animation configuration
   ↓
5. Component uses animation hook/component
   ↓
6. Hook checks reduced motion flag
   ↓
7. Apply appropriate animation variant
   ↓
8. Monitor performance (if enabled)
   ↓
9. Animation completes
   ↓
10. Cleanup (remove will-change, etc.)
```

### Scroll Animation Flow

```
1. Component with ScrollReveal mounts
   ↓
2. useScrollAnimation hook initializes
   ↓
3. Intersection Observer created
   ↓
4. Element enters viewport
   ↓
5. Observer callback fires
   ↓
6. isInView state updates
   ↓
7. Animation triggers
   ↓
8. Element animates into view
   ↓
9. Observer disconnects (if once=true)
```

### Performance Monitoring Flow

```
1. Animation starts
   ↓
2. usePerformance hook begins tracking
   ↓
3. requestAnimationFrame loop measures frame times
   ↓
4. Calculate FPS and frame statistics
   ↓
5. Check against performance budget
   ↓
6. Log warning if FPS < 30
   ↓
7. Animation completes
   ↓
8. Stop monitoring and report metrics
```

## Integration Points

### 1. Next.js App Router Integration

**File:** `app/layout.tsx`

```typescript
import { AnimationProvider } from '@/lib/animations/context/AnimationProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AnimationProvider>
          {children}
        </AnimationProvider>
      </body>
    </html>
  );
}
```

### 2. Existing Page Integration

**Example:** Update `app/page.tsx` to use new animation system

```typescript
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { StaggerList } from '@/components/animations/StaggerList';

// Replace existing motion components with new system
<ScrollReveal variant="fadeInUp">
  <HeroSection />
</ScrollReveal>

<AnimatedButton variant="primary" size="lg">
  Register Now
</AnimatedButton>

<StaggerList staggerDelay={50}>
  {items.map(item => <Card key={item.id} {...item} />)}
</StaggerList>
```

### 3. Tailwind CSS Configuration

**File:** `tailwind.config.js` (to be created/updated)

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
      },
    },
  },
};
```

## Performance Optimization Strategy

### 1. Bundle Size Optimization

- **Lazy Loading:** Animation components loaded on-demand
- **Tree Shaking:** Import only used Framer Motion features
- **Code Splitting:** Separate animation bundle from main bundle

```typescript
// Dynamic import for heavy animation components
const HeavyAnimation = dynamic(
  () => import('@/components/animations/HeavyAnimation'),
  { ssr: false }
);
```

### 2. Runtime Performance

- **GPU Acceleration:** Use `transform` and `opacity` only
- **will-change Management:** Apply only during animation
- **Debouncing:** Scroll events debounced to 16ms
- **Concurrent Animations:** Limit to 5 on mobile

### 3. Mobile Optimization

```typescript
// Detect device capabilities
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const lowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;

if (isMobile || lowMemory) {
  // Reduce animation complexity
  animationConfig.duration.normal = 200; // Faster
  animationConfig.stagger.normal = 30;   // Less delay
}
```

## Accessibility Implementation

### 1. Reduced Motion Support

```typescript
// Automatic detection and adaptation
const reducedMotion = useReducedMotion();

const variants = {
  hidden: { opacity: 0, y: reducedMotion ? 0 : 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: reducedMotion ? 0 : 0.3
    }
  }
};
```

### 2. Keyboard Navigation

- Focus indicators remain visible during animations
- Tab order preserved during transitions
- No animation blocking user interaction

### 3. Screen Reader Compatibility

- ARIA live regions for dynamic content
- Announce state changes appropriately
- No reliance on animation for information

## Error Handling

### 1. Graceful Degradation

```typescript
// Error boundary for animation components
class AnimationErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Animation error:', error, errorInfo);
    // Fall back to non-animated version
  }

  render() {
    if (this.state.hasError) {
      return this.props.children; // Render without animation
    }
    return this.props.children;
  }
}
```

### 2. Fallback Strategies

- If Framer Motion fails to load → Use CSS transitions
- If Intersection Observer unavailable → Show content immediately
- If performance is poor → Disable decorative animations

## Testing Strategy

### 1. Unit Tests

```typescript
// Test animation configuration
describe('animationConfig', () => {
  it('should have valid duration values', () => {
    expect(animationConfig.duration.fast).toBeGreaterThan(0);
    expect(animationConfig.duration.fast).toBeLessThan(2000);
  });
});

// Test hooks
describe('useReducedMotion', () => {
  it('should detect reduced motion preference', () => {
    // Mock matchMedia
    // Test hook behavior
  });
});
```

### 2. Integration Tests

```typescript
// Test component animations
describe('AnimatedButton', () => {
  it('should scale on hover', async () => {
    const { getByRole } = render(<AnimatedButton>Click</AnimatedButton>);
    const button = getByRole('button');
    
    await userEvent.hover(button);
    // Assert scale transform applied
  });
});
```

### 3. Visual Regression Tests

- Capture screenshots of animated states
- Compare against baseline images
- Detect unintended visual changes

### 4. Performance Tests

```typescript
describe('Performance', () => {
  it('should maintain 60fps during animations', () => {
    const { metrics } = renderWithPerformanceMonitoring(<AnimatedComponent />);
    expect(metrics.fps).toBeGreaterThanOrEqual(60);
  });

  it('should not exceed bundle size budget', () => {
    const bundleSize = getBundleSize('animations');
    expect(bundleSize).toBeLessThan(75 * 1024); // 75KB
  });
});
```

## Migration Plan

### Phase 1: Foundation (Week 1)
1. Create animation configuration system
2. Implement core hooks (useReducedMotion, useScrollAnimation)
3. Set up AnimationProvider
4. Create animation variants library

### Phase 2: Core Components (Week 2)
1. Build PageTransition component
2. Implement ScrollReveal component
3. Create AnimatedButton and AnimatedCard
4. Build SkeletonScreen components

### Phase 3: Integration (Week 3)
1. Integrate AnimationProvider in app/layout.tsx
2. Update homepage with new animation components
3. Add animations to admin dashboard
4. Implement form validation animations

### Phase 4: Optimization & Testing (Week 4)
1. Performance monitoring and optimization
2. Write comprehensive tests
3. Visual regression testing
4. Documentation and examples

## Security Considerations

1. **No User Input in Animations:** Animation parameters are hardcoded or validated
2. **XSS Prevention:** No `dangerouslySetInnerHTML` in animation components
3. **Resource Limits:** Maximum animation duration capped at 2000ms
4. **Memory Management:** Proper cleanup of observers and event listeners

## Monitoring & Metrics

### Key Performance Indicators

1. **Animation Performance**
   - Average FPS during animations
   - Frame drop rate
   - Animation completion time

2. **Bundle Size**
   - Total animation library size
   - Individual component sizes
   - Lazy-loaded chunk sizes

3. **User Experience**
   - Reduced motion usage percentage
   - Animation-related errors
   - Page load impact

### Logging Strategy

```typescript
// Performance logging
if (process.env.NODE_ENV === 'development') {
  console.log('[Animation]', {
    component: 'ScrollReveal',
    fps: metrics.fps,
    duration: metrics.duration,
    reducedMotion: reducedMotion
  });
}
```

## Future Enhancements (Phase 2)

1. **Advanced Scroll Effects**
   - Parallax scrolling
   - Scroll-linked animations
   - Horizontal scroll sections

2. **Gesture Animations**
   - Drag and drop
   - Swipe gestures
   - Pinch to zoom

3. **3D Transforms**
   - Card flip animations
   - 3D perspective effects
   - Rotation animations

4. **Advanced Loading States**
   - Progress indicators
   - Skeleton screen variations
   - Optimistic UI updates

## Conclusion

This design provides a solid foundation for the animation system with:
- Centralized configuration for consistency
- Performance-first approach
- Accessibility built-in
- Extensible architecture for future enhancements
- Comprehensive testing strategy
- Clear integration path with existing codebase

The system balances visual polish with performance and accessibility, ensuring a smooth user experience across all devices and user preferences.
