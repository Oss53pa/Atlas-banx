// ============================================================================
// ATLASBANX — Conditions Générales de Vente (CGV) — Audit express PARTICULIER
// ============================================================================
// Texte versionné, embarqué dans l'application (pas de dépendance base) afin
// que la barrière d'acceptation fonctionne pour un parcours public sans compte,
// AVANT tout import de relevé.
//
// ⚠️ Modèle rédigé pour un service B2C de détection de frais bancaires en zone
//    UEMOA/CEMAC (droit OHADA). À faire relire par un conseil juridique avant
//    exploitation commerciale — ne constitue pas un avis juridique.
// ============================================================================

export const CGV_PARTICULIER_VERSION = '2026-07-29';

export interface CgvSection {
  title: string;
  body: string[];
}

// ⚠️ À COMPLÉTER par l'éditeur avant exploitation commerciale (mentions légales
//    obligatoires). Les crochets signalent les informations à renseigner.
export const EDITOR_IDENTITY_FIELDS: { label: string; value: string }[] = [
  { label: 'Raison sociale', value: '[Raison sociale complète]' },
  { label: 'Forme juridique', value: '[SARL / SA / SAS …]' },
  { label: 'Capital social', value: '[Montant du capital]' },
  { label: 'RCCM', value: '[Numéro RCCM]' },
  { label: 'NIF / IDU', value: '[Numéro d’identification fiscale]' },
  { label: 'Siège social', value: '[Adresse complète, Abidjan, Côte d’Ivoire]' },
  { label: 'Directeur de la publication', value: '[Nom du représentant légal]' },
  { label: 'Email de contact', value: '[contact@…]' },
  { label: 'Téléphone', value: '[+225 …]' },
  { label: 'Médiateur de la consommation', value: '[Nom / coordonnées du médiateur]' },
];

export const CGV_PARTICULIER_SECTIONS: CgvSection[] = [
  {
    title: '0. Identité de l’éditeur',
    body: [
      'Le service est édité par Atlas Studio. Les informations légales complètes de l’éditeur sont les suivantes :',
      ...EDITOR_IDENTITY_FIELDS.map((f) => `${f.label} : ${f.value}`),
    ],
  },
  {
    title: '1. Objet et éditeur',
    body: [
      "Les présentes Conditions Générales de Vente (« CGV ») régissent le service « Audit express » proposé par Atlas Studio (Abidjan, Côte d'Ivoire) aux personnes physiques agissant à des fins non professionnelles (le « Client »).",
      "Le service consiste à analyser un relevé de compte bancaire fourni par le Client afin de détecter d'éventuels frais bancaires non conformes, puis à lui remettre un rapport d'audit détaillé et une lettre de réclamation type.",
      "En cochant la case d'acceptation, le Client reconnaît avoir lu et accepté sans réserve les présentes CGV. À défaut d'acceptation, le service ne peut être utilisé.",
    ],
  },
  {
    title: '2. Description du service et du livrable',
    body: [
      "1) Import d'un relevé bancaire au format PDF ; 2) analyse automatisée GRATUITE par le moteur de détection ; 3) affichage du montant potentiellement récupérable estimé ; 4) sur décision du Client, déblocage payant du rapport détaillé et de la lettre de réclamation.",
      "Le livrable est un rapport d'audit remis sous la forme d'un document PDF CERTIFIÉ et NON MODIFIABLE (chiffré, permissions restreintes à l'impression), portant une référence unique. Il est imprimable et enregistrable par le Client.",
      "L'analyse est réalisée par des algorithmes ; elle peut être complétée d'un traitement d'aide à la lecture. Aucune intervention humaine individualisée n'est garantie.",
    ],
  },
  {
    title: '3. Prix et paiement',
    body: [
      "L'analyse et l'affichage du montant récupérable estimé sont GRATUITS.",
      "Le prix du déblocage du rapport détaillé est égal à une fraction du montant récupérable estimé (à ce jour vingt pour cent (20 %)), avec un montant plancher. Lorsque le montant récupérable estimé est inférieur à un seuil défini, le rapport est fourni gratuitement.",
      "Le prix applicable est affiché clairement AVANT tout paiement, ainsi que le gain net estimé. Le Client ne paie qu'après avoir vu le montant récupérable estimé.",
      "Le paiement s'effectue par mobile money via un prestataire de paiement tiers. Atlas Studio ne conserve aucune coordonnée bancaire ou de paiement.",
    ],
  },
  {
    title: '4. Nature du service — absence de garantie de remboursement',
    body: [
      "Le montant « récupérable » affiché est une ESTIMATION calculée à partir des frais détectés sur le relevé fourni ; il ne constitue en aucun cas une promesse, une garantie ou un engagement de remboursement par la banque du Client.",
      "Atlas Studio fournit un outil d'analyse et un document de réclamation. La décision de rembourser appartient exclusivement à la banque. Atlas Studio est tenue à une obligation de moyens, non de résultat, et n'intervient pas dans la relation entre le Client et sa banque.",
      "La qualité de l'analyse dépend de la lisibilité et de l'exhaustivité du relevé fourni par le Client.",
    ],
  },
  {
    title: '5. Service sans compte, éphémère',
    body: [
      "Le service est accessible sans création de compte. Le parcours est éphémère : à sa clôture, le relevé importé, les transactions et les données personnelles ne sont pas conservés par Atlas Studio.",
      "Il appartient au Client de télécharger et de conserver son rapport et sa lettre de réclamation ; ils ne pourront pas être régénérés ultérieurement.",
    ],
  },
  {
    title: '6. Données personnelles, confidentialité et archive de preuve',
    body: [
      "Le relevé et les transactions sont traités uniquement pour réaliser l'analyse demandée, le temps de la session, puis supprimés. AUCUNE donnée du relevé (opérations, soldes, nom du titulaire, numéro de compte) n'est conservée après la clôture du parcours.",
      "Par exception et à des fins exclusives de PREUVE en cas de contrôle ou d'enquête, Atlas Studio conserve une ARCHIVE MINIMALE et inviolable de chaque livrable certifié : sa référence unique, l'empreinte cryptographique (SHA-256) du PDF, et des métadonnées NON NOMINATIVES (banque concernée, période, nombre d'anomalies, montant total). Cette archive ne contient ni le relevé, ni le nom du Client, ni le détail des opérations. Elle permet uniquement d'attester l'authenticité d'un rapport présenté ultérieurement.",
      "Les coordonnées éventuellement saisies (email, téléphone) servent exclusivement à la remise du rapport et à l'exécution du paiement. Le Client dispose d'un droit d'accès, de rectification et d'effacement de ses données.",
    ],
  },
  {
    title: '7. Droit de rétractation',
    body: [
      "Le service est un contenu numérique fourni immédiatement. Le Client demande expressément l'exécution immédiate du déblocage du rapport et reconnaît qu'une fois le rapport débloqué et mis à disposition, la prestation est pleinement exécutée : il renonce en conséquence à tout droit de rétractation sur cette prestation.",
      "Tant que le rapport n'est pas débloqué, le Client peut interrompre le parcours sans frais.",
    ],
  },
  {
    title: '8. Responsabilité',
    body: [
      "La responsabilité d'Atlas Studio est limitée au montant effectivement payé par le Client pour le déblocage du rapport concerné.",
      "Atlas Studio ne saurait être tenue responsable des décisions de la banque du Client, d'un défaut de remboursement, ni des conséquences d'un relevé incomplet, illisible ou altéré fourni par le Client.",
    ],
  },
  {
    title: '9. Propriété intellectuelle',
    body: [
      "Le rapport et la lettre sont fournis au Client pour son usage personnel dans le cadre de sa réclamation. Le moteur d'analyse, les modèles de documents et l'ensemble des éléments du service restent la propriété d'Atlas Studio.",
    ],
  },
  {
    title: '10. Réclamations, médiation et droit applicable',
    body: [
      "Toute réclamation relative au service peut être adressée à Atlas Studio. En cas de litige non résolu à l'amiable, le Client peut recourir à la médiation.",
      "Les présentes CGV sont soumises au droit en vigueur en Côte d'Ivoire et aux Actes uniformes OHADA. Les juridictions compétentes sont celles du ressort du siège d'Atlas Studio, sous réserve des règles protectrices d'ordre public applicables au Client consommateur.",
    ],
  },
];

/** Texte brut (utile pour archivage / hash / affichage plein texte). */
export function cgvParticulierPlainText(): string {
  const header = `ATLAS STUDIO — CONDITIONS GÉNÉRALES DE VENTE — AUDIT EXPRESS (PARTICULIERS)\nVersion ${CGV_PARTICULIER_VERSION}\n`;
  return [header, ...CGV_PARTICULIER_SECTIONS.map((s) => `${s.title}\n${s.body.join('\n')}`)].join('\n\n');
}
