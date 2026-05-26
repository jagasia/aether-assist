export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-10 text-center shadow-2xl shadow-slate-950/30">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Page not found</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">This page can’t be found.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Return to the main chat to continue your private assistant session.
          </p>
        </div>
      </div>
    </div>
  );
}
