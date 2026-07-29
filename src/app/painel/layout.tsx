import { redirect } from "next/navigation";
import { sairAction } from "@/app/actions";
import { Sidebar } from "@/components/Sidebar";
import { Pulso } from "@/components/ui";
import { sessaoAtual, podeEscrever } from "@/lib/session";
import { rotularEnum } from "@/lib/utils";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual().catch(() => null);
  if (!sessao) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200/60 bg-slate-50/70 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/60 bg-slate-50/70 px-6 py-3 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="fonte-display truncate text-sm font-semibold text-slate-900">
              Faculdade Brasileira de Negócios Inovadores{" "}
              <span className="texto-neon">— FABRANI</span>
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Pulso tom="ok" />
              Código e-MEC 1751876 · EaD · Jaboticabal/SP
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-800">{sessao.nome}</p>
              <p className="text-[11px] text-slate-500">
                {rotularEnum(sessao.papel)}
                {podeEscrever(sessao) ? "" : " · somente leitura"}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400/25 to-violet-500/25 text-xs font-semibold text-slate-900 ring-1 ring-cyan-400/30">
              {sessao.nome.slice(0, 2).toUpperCase()}
            </span>
            <form action={sairAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-rose-400/50 hover:text-slate-900"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
