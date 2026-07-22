import Link from "next/link";

export function AuthShell({ title, description, children, footer }: Readonly<{
  title: string; description: string; children: React.ReactNode; footer: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-lg font-bold text-slate-950">Workflow</Link>
        <h1 className="mt-8 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
        <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">{footer}</div>
      </section>
    </main>
  );
}
