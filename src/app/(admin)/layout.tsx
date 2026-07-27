export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - will be built in Sprint 4 */}
      <aside className="hidden lg:flex w-64 flex-col bg-ink">
        <div className="p-6">
          <span className="font-heading text-xl font-semibold text-white tracking-[2px]">
            HORKOS
          </span>
          <span className="block text-xs text-warm-grey mt-1">Administration</span>
        </div>
      </aside>
      <main className="flex-1 bg-cream">{children}</main>
    </div>
  );
}
