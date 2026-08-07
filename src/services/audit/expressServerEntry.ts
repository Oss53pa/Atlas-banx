// ============================================================================
// Point d'entrée SERVEUR de l'audit express — bundlé (esbuild) vers
// supabase/functions/_shared/audit-core.mjs pour l'edge function `express-audit`.
// Ne réexporte que le moteur PUR (aucune dépendance navigateur/Supabase) afin
// que le récupérable et le rapport soient calculés côté serveur (autoritaires).
// Régénérer après modif du moteur :  npm run build:audit-core
// ============================================================================

export { runFullAudit } from './runFullAudit';
export { partitionByCertainty } from './anomalyCertainty';
export { pricingForRecovery } from '../../billing/recoveryPricing';
export { auditReportToHtml } from '../../billing/express/auditReportHtml';
