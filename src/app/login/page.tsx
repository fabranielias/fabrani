import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { FormularioLogin } from "./FormularioLogin";

const DESTAQUES = [
  { titulo: "Dossiê guiado", detalhe: "A secretaria preenche a IES e os cursos passo a passo" },
  { titulo: "Sócrates residente", detalhe: "Avaliador sênior que aponta, redige e preenche" },
  { titulo: "Evidência rastreável", detalhe: "Cada indicador com o documento que o comprova" },
];

export default async function LoginPage() {
  const sessao = await sessaoAtual().catch(() => null);
  if (sessao) redirect("/painel");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="entrada relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-y-32 left-[38%] w-px rotate-[16deg] bg-gradient-to-b from-transparent via-amber-400/70 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-y-32 left-[62%] w-px rotate-[16deg] bg-gradient-to-b from-transparent via-amber-400/25 to-transparent"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 fonte-display text-sm font-bold text-slate-50 shadow-[0_0_28px_-6px_rgba(255,194,51,0.95)]">
            F
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700">FABRANI · MEC</p>
        </div>

        <div className="relative">
          <h1 className="fonte-display max-w-xl text-[52px] font-semibold leading-[1.02] tracking-[-0.035em] text-slate-900">
            Regulação que se prova
            <br />
            com <span className="texto-neon">evidência</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-500">
            Um espelho executável dos instrumentos do INEP: o critério do conceito 5, o documento que o comprova, o
            responsável e o prazo — SINAES, ENADE, Censo, e-MEC e EaD no mesmo lugar.
          </p>

          <ul className="mt-10 grid gap-5">
            {DESTAQUES.map((item) => (
              <li key={item.titulo} className="border-l-2 border-amber-400/70 pl-4">
                <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{item.detalhe}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.22em] text-slate-500">
          e-MEC 1751876 · EaD · Jaboticabal/SP
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="superficie fio-neon entrada w-full max-w-sm rounded-2xl border border-slate-200/70 p-8">
          <h2 className="fonte-display text-xl font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Acesso restrito à equipe institucional.</p>
          <FormularioLogin />
        </div>
      </section>
    </main>
  );
}
