export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - will be built in Sprint 3 */}
      <aside className="hidden lg:flex w-64 flex-col bg-cream border-r border-cream-deep">
        <div className="p-6">
          <span className="font-heading text-xl font-semibold text-ink tracking-[2px]">
            HORKOS
          </span>
        </div>
      </aside>
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}
