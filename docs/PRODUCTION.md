# Mise en production — AtlasBanx

Checklist de passage en production pour une exploitation avec **données
bancaires clientes réelles**. Cochez chaque point avant le GO.

> Un diagnostic automatique s'affiche dans la console du navigateur au
> démarrage (`src/lib/configHealth.ts`) : il signale en **rouge** toute
> configuration critique manquante en build de production.

---

## 1. Configuration d'environnement (bloquant)

| Variable | Où | Rôle | Obligatoire |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Front (Vercel) | Projet Supabase **dédié** | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Front (Vercel) | Clé anon du projet | ✅ |
| `VITE_DEMO_MODE` | Front | Doit valoir `false` (ou absent) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Accès service role | ✅ |
| `ATLAS_FINANCE_API_URL` / `_API_KEY` | Edge Functions | Push écarts → Atlas Finance | ⚠️ (repli local sinon) |
| `ADVIST_*` | Edge Functions | Signature électronique RFC 3161 | ⚠️ (signature simple sinon) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Edge Functions | Emails transactionnels | ⚠️ |
| `GROQ_API_KEY` | Edge Functions | Si Groq appelé côté serveur | Optionnel |

> ⚠️ **Repli Supabase mutualisé** : sans `VITE_SUPABASE_*` explicites, l'app
> pointe vers un projet Supabase **partagé** (repli Atlas Studio). Acceptable
> en démo, **interdit** pour de vraies données clientes — chaque déploiement
> production doit avoir son propre projet.

---

## 2. Sécurité

### Fait
- [x] RLS multi-tenant par organisation (migrations 026–029)
- [x] Chaîne d'audit append-only signée SHA-256
- [x] Workflow à 2 yeux (référentiels, anomalies)
- [x] Chiffrement des clés API (AES-256-GCM)
- [x] OCR 100 % hors-ligne (aucune fuite de document)
- [x] **IP allowlist — Edge Function d'enforcement implémentée** (fail-open)

### À finaliser avant GO (action humaine / configuration)
- [ ] **Activer le hook IP allowlist** : Supabase Dashboard → Auth → Hooks →
      pointer vers `enforce-ip-allowlist`. **Tester d'abord sur un compte
      jetable** (un bug de hook peut verrouiller tous les utilisateurs — la
      fonction est fail-open par conception, mais valider en réel).
- [ ] **MFA cabinet** : actuellement *soft*. Rendre obligatoire après la
      période de migration (config Supabase Auth).
- [ ] **Textes légaux** (CGU, politique de confidentialité, mentions) :
      les documents seedés sont du **boilerplate** — les faire **valider par
      un juriste** avant mise en ligne. *(Ne pas déployer les textes par
      défaut tels quels.)*
- [ ] **Chiffrement colonnaire** des données les plus sensibles : reporté,
      à évaluer selon l'exposition.

### Hors périmètre logiciel
- [ ] SOC 2 Type II / ISO 27001 : démarches organisationnelles (audit sur
      6–12 mois), non couvertes par le code.

---

## 3. Qualité & CI

- [x] `npm run build` → succès
- [x] `npx tsc --noEmit` → 0 erreur
- [x] `npx eslint .` → 0 erreur
- [x] `npx vitest run` → suite verte
- [ ] Brancher ces 4 commandes en CI bloquante (GitHub Actions) avant merge.

---

## 4. Données

- [x] L'extraction des conditions bancaires utilise le **vrai extracteur**
      (`extractConditions`), plus de données mock dans l'écran de validation.
- Les écrans `statement-detail` retombent sur des données de démonstration
      **uniquement** si Supabase n'est pas configuré (`isSupabaseConfigured()`).
      En production correctement configurée, ce repli n'est jamais atteint.

---

## 5. Go / No-Go

| Cas d'usage | Verdict |
|---|---|
| Démo / pilote / beta | ✅ Prêt |
| Production, données bancaires réelles | 🟡 Après avoir coché les points **bloquants** des sections 1 et 2 |
