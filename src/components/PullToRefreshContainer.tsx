import { ReactNode, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshContainerProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
}

const PULL_THRESHOLD = 72;
const MAX_PULL = 120;

export const PullToRefreshContainer = ({ children, onRefresh, className = "" }: PullToRefreshContainerProps) => {
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const canTrigger = useMemo(() => pullDistance >= PULL_THRESHOLD, [pullDistance]);

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (window.scrollY > 0 || refreshing) {
      startYRef.current = null;
      return;
    }
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (startYRef.current === null || refreshing) return;
    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    setPullDistance(Math.min(MAX_PULL, delta * 0.5));
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = async () => {
    startYRef.current = null;
    if (refreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(52);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
      return;
    }

    setPullDistance(0);
  };

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance ? `translateY(${pullDistance}px)` : undefined,
        transition: startYRef.current === null ? "transform 180ms ease-out" : "none",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 transition-all"
        style={{ top: -36 + pullDistance, opacity: pullDistance > 6 || refreshing ? 1 : 0 }}
      >
        <div className="rounded-full border border-border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className={`h-3.5 w-3.5 ${refreshing || canTrigger ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : canTrigger ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
};
