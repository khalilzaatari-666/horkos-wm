import { Panel } from "@/components/client/ui";
import { SkeletonHead, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Panel>
      <SkeletonHead />
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </Panel>
  );
}
