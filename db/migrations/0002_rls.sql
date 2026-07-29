-- Blindagem para uso no Supabase.
-- A aplicação acessa o banco por conexão direta (role owner), que ignora RLS.
-- As chaves publicáveis (anon/authenticated) chegam pelo PostgREST: aqui elas ficam sem
-- qualquer política, ou seja, sem leitura nem escrita em nenhuma tabela do domínio.
-- Em Postgres local esses roles não existem; o bloco simplesmente os ignora.

do $$
declare
  t record;
  roles text := '';
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    roles := 'anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    roles := case when roles = '' then 'authenticated' else roles || ', authenticated' end;
  end if;

  for t in
    select tablename from pg_tables
     where schemaname = 'public' and tablename <> '_migration'
  loop
    -- sem "force": o owner da tabela (conexão da aplicação) continua enxergando os dados.
    execute format('alter table public.%I enable row level security', t.tablename);
    if roles <> '' then
      execute format('revoke all on public.%I from %s', t.tablename, roles);
    end if;
  end loop;

  if roles <> '' then
    execute format('revoke usage on schema public from %s', roles);
  end if;
end
$$;
