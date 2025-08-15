export default function Card(
  { title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }
) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-lg font-medium">{title}</h2>
        {footer}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}