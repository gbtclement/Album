import type { ReactNode } from "react";

// Classes partagées par les pages et formulaires d'authentification.
// Ce style est propre à l'authentification : il sera répliqué sur le reste du site plus tard.
export const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10";

export const primaryButtonClass =
  "w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 font-semibold text-zinc-950 shadow-lg shadow-orange-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-zinc-100 transition hover:bg-white/10";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0914] px-4 py-12 text-zinc-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Album</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-zinc-400">{subtitle}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {children}
        </div>

        <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
      </div>
    </main>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </p>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-zinc-500">
      <span className="h-px flex-1 bg-white/10" />
      ou
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
