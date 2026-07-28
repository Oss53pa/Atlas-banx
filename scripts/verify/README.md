# Vérification post-déploiement — contrôles d'accès admin

Deux scripts complémentaires pour confirmer, après chaque déploiement, que les
correctifs de sécurité (migrations 042–049) sont en place et **effectifs**.

## 1. `verify_admin_security.sql` — contrôles structurels

Exécuter en tant que `postgres` dans la **console SQL Supabase** (ou `psql`).
Vérifie les définitions de fonctions, les ACL et les policies RLS.

```bash
psql "$DATABASE_URL" -f scripts/verify/verify_admin_security.sql
```

Attendu : **toutes les lignes `PASS`** et `controles_en_echec = 0`.

> Limite : en console SQL, `session_user = 'postgres'` court-circuite
> `is_admin()`. Ce script ne peut donc pas prouver qu'un non-admin est refusé
> *à l'exécution* — c'est le rôle du script API ci-dessous.

## 2. `verify_admin_security_api.sh` — contrôles comportementaux

Frappe l'API PostgREST avec de **vrais jetons** (identité `authenticator`,
seul contexte où `is_admin()` emprunte le contrôle sur `profiles.role`).

```bash
SUPABASE_URL="https://<project>.supabase.co" \
ANON_KEY="<clé anon>" \
ADMIN_JWT="<access_token d'un compte admin>" \
NONADMIN_JWT="<access_token d'un compte non-admin>" \
  bash scripts/verify/verify_admin_security_api.sh
```

`ADMIN_JWT` / `NONADMIN_JWT` sont optionnels : les contrôles qui en dépendent
sont `SKIP` s'ils manquent. Récupérer un `access_token` après connexion :

```js
(await window.supabase?.auth.getSession())?.data?.session?.access_token
```

Contrôles :

| # | Vérifie que… | Attendu |
|---|---|---|
| A | anon INSERT direct dans l'archive | refusé (4xx) |
| B | anon via RPC `express_archive_insert` | OK (crée une ligne test `VERIFY-…`) |
| C | non-admin appelle `publish_bank_reference_version` | refusé (message admin) |
| D | non-admin appelle `admin_reference_journal` | refusé (message admin) |
| E | non-admin lit les brouillons L2 | vide (`[]`) |
| F | admin appelle `admin_reference_journal` | OK (2xx) |

Le test B insère une ligne d'archive `VERIFY-<timestamp>` (inoffensive,
non nominative). Pour la retirer :

```sql
DELETE FROM atlasbanx.express_report_archive WHERE report_ref LIKE 'VERIFY-%';
```
