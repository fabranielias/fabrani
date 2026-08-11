-- 0006 — anexo em qualquer cadastro do sistema
--
-- Amplia os alvos de evidência para todas as entidades do CRUD: visita in loco,
-- supervisão, resultado da CPA, membro de colegiado, ENADE por curso e por
-- estudante, módulo e pendência do Censo, norma e indicador de qualidade.
--
-- Reversão: restaurar a lista de 0005_trilha.sql.

alter table evidencia_vinculo drop constraint if exists evidencia_vinculo_alvo_tipo_check;
alter table evidencia_vinculo add constraint evidencia_vinculo_alvo_tipo_check
  check (alvo_tipo is null or alvo_tipo in (
    'AVALIACAO_INDICADOR','REQUISITO_LEGAL','INDICADOR','TRILHA_PASSO','SUGESTAO',
    'MANTENEDORA','IES','CURSO','POLO','ATO','PROCESSO','VISITA','PRAZO','SUPERVISAO',
    'CPA_CICLO','CPA_RESULTADO','COLEGIADO','MEMBRO','REUNIAO','PESSOA',
    'ENADE_CICLO','ENADE_CURSO','ENADE_ESTUDANTE',
    'CENSO_ANO','CENSO_MODULO','CENSO_PENDENCIA','NORMA','INDICADOR_QUALIDADE'
  ));
