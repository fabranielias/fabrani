/**
 * Radar normativo.
 *
 * Sem feed externo, o radar trabalha com o que a instituição já cadastrou na
 * base normativa: norma nova sem avaliação de impacto, norma crítica sem prazo
 * derivado e norma vigente sem dispositivo carregado no corpus do Sócrates.
 * Determinístico e sem custo.
 */

import { query } from "../db";

export type ItemRadar = {
  normaId: string;
  regra: string;
  severidade: "RISCO" | "ATENCAO" | "INFO";
  titulo: string;
  mensagem: string;
};

export async function varrerRadar(): Promise<ItemRadar[]> {
  const semImpacto = await query<{ id: string; rotulo: string }>(
    `select id, concat_ws(' ', especie, numero, '/', ano, '—', orgao) as rotulo
       from norma
      where coalesce(vigente, true)
        and coalesce(observacao, '') = ''
        and coalesce(data_publicacao, current_date) >= current_date - 540`,
  );
  const semPrazo = await query<{ id: string; rotulo: string }>(
    `select n.id, concat_ws(' ', n.especie, n.numero, '/', n.ano, '—', n.orgao) as rotulo
       from norma n
      where n.relevancia = 'CRITICA' and coalesce(n.vigente, true)
        and not exists (select 1 from prazo p where p.base_legal ilike '%' || n.numero || '%')`,
  );
  const semCorpus = await query<{ id: string; rotulo: string }>(
    `select n.id, concat_ws(' ', n.especie, n.numero, '/', n.ano, '—', n.orgao) as rotulo
       from norma n
      where n.relevancia in ('CRITICA','ALTA') and coalesce(n.vigente, true)
        and not exists (select 1 from norma_dispositivo d where d.norma_id = n.id)`,
  );

  return [
    ...semPrazo.map((n) => ({
      normaId: n.id,
      regra: "radar_norma_sem_prazo",
      severidade: "RISCO" as const,
      titulo: `Norma crítica sem obrigação registrada: ${n.rotulo}`,
      mensagem: "Nenhum prazo da instituição referencia esta norma. Registre a obrigação decorrente e o responsável.",
    })),
    ...semImpacto.map((n) => ({
      normaId: n.id,
      regra: "radar_norma_sem_impacto",
      severidade: "ATENCAO" as const,
      titulo: `Norma sem avaliação de impacto: ${n.rotulo}`,
      mensagem: "Descreva no campo de impacto institucional o que muda na FABRANI e quais indicadores são afetados.",
    })),
    ...semCorpus.map((n) => ({
      normaId: n.id,
      regra: "radar_norma_sem_dispositivo",
      severidade: "INFO" as const,
      titulo: `Norma fora do corpus do Sócrates: ${n.rotulo}`,
      mensagem: "Sem dispositivos carregados, o Sócrates não cita esta norma nas análises.",
    })),
  ];
}

/** Persiste o radar como sugestões abertas, sem duplicar. */
export async function sincronizarRadar(): Promise<number> {
  const itens = await varrerRadar();
  let criadas = 0;
  for (const item of itens) {
    const inseridas = await query<{ id: string }>(
      `insert into socrates_sugestao (alvo_tipo, alvo_id, regra, severidade, titulo, mensagem, origem)
       select 'NORMA',$1,$2,$3,$4,$5,'RADAR'
        where not exists (
          select 1 from socrates_sugestao
           where regra = $2 and alvo_id = $1 and status = 'ABERTA')
       returning id`,
      [item.normaId, item.regra, item.severidade, item.titulo, item.mensagem],
    );
    criadas += inseridas.length;
  }
  return criadas;
}
