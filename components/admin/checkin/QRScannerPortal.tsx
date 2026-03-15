'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface QRScannerPortalProps {
  children: React.ReactNode;
  containerId: string;
}

export function QRScannerPortal({ children, containerId }: QRScannerPortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create a container div for the portal
    const container = document.createElement('div');
    container.id = containerId;
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    containerRef.current = container;
    
    // Find the target element and append our container
    const targetElement = document.getElementById('reader');
    if (targetElement) {
      targetElement.appendChild(container);
    }

    return () => {
      // Cleanup: remove the container when component unmounts
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, [containerId]);

  // Only render portal if container is ready
  if (!containerRef.current) {
    return null;
  }

  return createPortal(children, containerRef.current);
}