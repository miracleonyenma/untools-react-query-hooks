// ./src/hooks/useIntersectionObserver.ts

import { useEffect, useRef, useState } from "react";

export interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useIntersectionObserver = ({
  threshold = 0.1,
  rootMargin = "0px",
  enabled = true,
}: UseIntersectionObserverOptions = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin, enabled]);

  const reset = () => {
    setHasIntersected(false);
    setIsIntersecting(false);
  };

  return {
    targetRef,
    isIntersecting,
    hasIntersected,
    reset,
  };
};
