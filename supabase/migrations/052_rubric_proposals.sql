-- ============================================================================
-- 052 — Rubriques proposées (workflow proposer → l'admin valide → auto-créée)
-- ============================================================================
-- Quand des conditions importées contiennent une rubrique qui n'existe pas
-- dans l'application, l'utilisateur PROPOSE de l'ajouter. Un administrateur la
-- VALIDE (ou la rejette). Une fois validée, la rubrique devient une rubrique
-- connue de l'application, réutilisée par les imports suivants.
--
-- Sécurité :
--   • INSERT (proposer) : tout utilisateur authentifié, mais uniquement au
--     statut « proposed » et à son propre nom (proposed_by = auth.uid()).
--   • SELECT : les rubriques « approved » sont visibles de tous ; les
--     propositions en attente / rejetées ne sont visibles que des admins.
--   • Validation / rejet : réservés aux admins, via des RPC SECURITY DEFINER
--     protégées par public.is_admin(). Aucun UPDATE/DELETE direct.
-- ============================================================================

create table if not exists atlasbanx.rubric_proposals (
  id               uuid primary key default gen_random_uuid(),
  -- Clé de rubrique proposée (custom:<categorie>:<slug>). Unique : reproposer
  -- la même rubrique est idempotent (aucun doublon de proposition).
  rubric_key       text not null,
  label            text not null,
  category         text not null,
  unit             text not null default 'amount',
  status           text not null default 'proposed'
                     check (status in ('proposed', 'approved', 'rejected')),
  -- Libellé brut extrait du document (contexte pour l'admin).
  source_label     text,
  -- Contexte : banque d'où provient la proposition (facultatif).
  bank_code        text,
  proposed_by      uuid not null default auth.uid(),
  validated_by     uuid,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  validated_at     timestamptz,
  unique (rubric_key)
);

create index if not exists rubric_proposals_status_idx
  on atlasbanx.rubric_proposals (status);

alter table atlasbanx.rubric_proposals enable row level security;

-- Lecture : rubriques validées pour tous, tout pour les admins.
drop policy if exists rubric_proposals_select on atlasbanx.rubric_proposals;
create policy rubric_proposals_select on atlasbanx.rubric_proposals
  for select
  using (status = 'approved' or public.is_admin());

-- Proposer : uniquement « proposed » et en son propre nom.
drop policy if exists rubric_proposals_insert on atlasbanx.rubric_proposals;
create policy rubric_proposals_insert on atlasbanx.rubric_proposals
  for insert
  with check (status = 'proposed' and proposed_by = auth.uid());

grant select, insert on atlasbanx.rubric_proposals to authenticated;
-- Pas d'UPDATE/DELETE direct : la validation passe par les RPC ci-dessous.

-- ── RPC admin : valider une proposition ────────────────────────────────────
create or replace function atlasbanx.approve_rubric_proposal(p_id uuid)
returns atlasbanx.rubric_proposals
language plpgsql
security definer
set search_path = atlasbanx, public
as $$
declare
  v_row atlasbanx.rubric_proposals;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  update atlasbanx.rubric_proposals
     set status       = 'approved',
         validated_by = auth.uid(),
         validated_at = now(),
         rejection_reason = null
   where id = p_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'Proposition introuvable (%).', p_id using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

-- ── RPC admin : rejeter une proposition ────────────────────────────────────
create or replace function atlasbanx.reject_rubric_proposal(p_id uuid, p_reason text default null)
returns atlasbanx.rubric_proposals
language plpgsql
security definer
set search_path = atlasbanx, public
as $$
declare
  v_row atlasbanx.rubric_proposals;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  update atlasbanx.rubric_proposals
     set status           = 'rejected',
         validated_by     = auth.uid(),
         validated_at     = now(),
         rejection_reason = p_reason
   where id = p_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'Proposition introuvable (%).', p_id using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function atlasbanx.approve_rubric_proposal(uuid) from public;
revoke all on function atlasbanx.reject_rubric_proposal(uuid, text) from public;
grant execute on function atlasbanx.approve_rubric_proposal(uuid) to authenticated;
grant execute on function atlasbanx.reject_rubric_proposal(uuid, text) to authenticated;
