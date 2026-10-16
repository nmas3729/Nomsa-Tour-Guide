import { Skeleton } from "./skeleton";

export function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading content" className="grid gap-3">
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton className="h-4 w-full" key={index} />
      ))}
    </div>
  );
}
