import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { FormularioLogin } from "./FormularioLogin";

export default async function LoginPage() {
  const sessao = await sessaoAtual().catch(() => null);
  if (sessao) redirect("/painel");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="entrada relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div>
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 fonte-display text-base font-bold text-slate-50 shadow-[0_0_28px_-6px_rgba(34,211,238,0.9)]">
            F
          </span>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Faculdade Brasileira de Negócios Inovadores
          </p>
          <h1 className="fonte-display mt-3 max-w-lg text-4xl font-semibold leading-tight text-slate-900">
            Gestão regulatória, avaliativa e censitária{" "}
            <span className="texto-neon">com o Sócrates dentro</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
            Um espelho executável dos instrumentos do INEP: cada indicador com o critério do conceito 5, a evidência
            que o comprova, o responsável e o prazo — e um avaliador sênior residente que aponta, redige e preenche.
          </p>
        </div>
        <ul className="grid gap-2.5 text-xs text-slate-500">
          {[
            "SINAES · instrumentos versionados e simulação de CI/CC",
            "Regulação · e-MEC, reconhecimento, recredenciamento e supervisão",
            "ENADE e Censo · enquadramento, regularidade e módulos do Censup",
            "EaD · polos e adequação ao Decreto nº 12.456/2025",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="size-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="superficie entrada w-full max-w-sm rounded-2xl border border-slate-200/70 p-8">
          <h2 className="fonte-display text-xl font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Acesso restrito à equipe institucional.</p>
          <FormularioLogin />
        </div>
      </section>
    </main>
  );
}
