import { AdminPanel } from "@/components/admin/ui";
import { SkeletonHead, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AdminPanel>
      <SkeletonHead />
      <SkeletonRows />
    </AdminPanel>
  );
}
