"use client";

export const dynamic = "force-static";

export default function GlobalError({ error }: { error: Error }) {
  console.error(error);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-10 text-center shadow-2xl shadow-slate-950/30">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Unexpected error</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Something went wrong.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Refresh the page or try again later.
          </p>
        </div>
      </div>
    </div>
  );
}
