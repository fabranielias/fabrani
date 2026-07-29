import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { FormularioLogin } from "./FormularioLogin";

export default async function LoginPage() {
  const sessao = await sessaoAtual().catch(() => null);
  if (sessao) redirect("/painel");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-slate-900 p-12 text-slate-200 lg:flex">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Faculdade Fabrani</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Gestão regulatória, avaliativa e censitária
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Um espelho executável dos instrumentos do INEP: cada indicador com o critério do conceito 5, a evidência
            que o comprova, o responsável e o prazo.
          </p>
        </div>
        <ul className="grid gap-2 text-xs text-slate-400">
          <li>SINAES · instrumentos versionados e simulação de CI/CC</li>
          <li>Regulação · e-MEC, reconhecimento, recredenciamento e supervisão</li>
          <li>ENADE e Censo · enquadramento, regularidade e módulos do Censup</li>
          <li>EaD · polos e adequação ao Decreto nº 12.456/2025</li>
        </ul>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Acesso restrito à equipe institucional.</p>
          <FormularioLogin />
        </div>
      </section>
    </main>
  );
}
