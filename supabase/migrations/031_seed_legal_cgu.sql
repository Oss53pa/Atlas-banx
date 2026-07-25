-- ============================================================================
-- Migration 031 — Publication des CGU officielles Atlas Studio (fr)
-- ----------------------------------------------------------------------------
-- Remplace le texte CGU boilerplate par la version rédigée et validée.
-- - marque toute version 'cgu' fr antérieure comme superseded
-- - insère la nouvelle version avec un content_hash SHA-256 calculé du contenu
-- Idempotent : ON CONFLICT (policy_type, version, language) DO UPDATE.
-- Le hash est calculé avec sha256() natif (PostgreSQL 14+), sans pgcrypto.
-- ============================================================================

-- 1. Supersède les anciennes versions CGU (fr) encore actives.
UPDATE atlasbanx.policy_versions
   SET superseded_at = NOW()
 WHERE policy_type = 'cgu'
   AND language = 'fr'
   AND superseded_at IS NULL;

-- 2. Insère la version courante. Le hash est dérivé du contenu inséré.
WITH new_cgu AS (
  SELECT $cgu_fr$ATLAS STUDIO — CONDITIONS GÉNÉRALES D'UTILISATION
Version 2026-07-25

01. DÉFINITIONS

Atlas Studio : La société Atlas Studio, éditrice des Applications, dont le siège social est à Abidjan, Côte d'Ivoire.
Utilisateur : Toute personne physique ou morale accédant aux Applications via un compte enregistré, qu'il s'agisse du titulaire principal ou d'un utilisateur invité.
Application : Tout logiciel SaaS mis à disposition par Atlas Studio sur la plateforme atlas-studio.org, y compris les produits listés à l'article 4.
Compte : L'espace personnel sécurisé créé lors de l'inscription, permettant l'accès aux Applications souscrites.
Abonnement : Le contrat à durée déterminée (mensuel ou annuel) donnant droit à l'utilisation d'une ou plusieurs Applications selon le plan choisi.
Données : L'ensemble des informations, fichiers, données financières, comptables ou opérationnelles saisis, importés ou générés par l'Utilisateur dans les Applications.
Contenu : Tout texte, document, rapport, configuration, paramétrage ou output produit via les Applications.
Plan : L'offre tarifaire choisie par l'Utilisateur (Starter, Pro, Business ou Enterprise selon les Applications).
OHADA : Organisation pour l'Harmonisation en Afrique du Droit des Affaires, dont le droit uniforme s'applique en Côte d'Ivoire.
SYSCOHADA : Le Système Comptable OHADA révisé, référentiel comptable applicable aux entreprises de l'espace OHADA.

02. OBJET ET CHAMP D'APPLICATION

Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'ensemble des Applications proposées par Atlas Studio. Elles constituent un contrat juridiquement contraignant entre Atlas Studio et tout Utilisateur.

En créant un compte, en activant une période d'essai ou en souscrivant à un Abonnement payant, l'Utilisateur reconnaît avoir lu, compris et accepté les présentes CGU dans leur intégralité, sans réserve.

En cas de souscription pour le compte d'une personne morale (entreprise, association, administration), la personne physique effectuant l'inscription déclare disposer du pouvoir de représenter et d'engager ladite entité.

Les présentes CGU prévalent sur tout document antérieur ou tout échange oral entre les parties. Elles peuvent être complétées par des Conditions Particulières propres à certaines Applications, lesquelles prévalent sur les CGU en cas de contradiction.

03. ÉLIGIBILITÉ ET CRÉATION DE COMPTE

Conditions d'éligibilité :
• Être une personne physique majeure (18 ans ou plus) ou une personne morale régulièrement constituée.
• Disposer de la capacité juridique nécessaire à la conclusion d'un contrat selon le droit ivoirien et/ou le droit OHADA applicable.
• Ne pas avoir fait l'objet d'une résiliation antérieure de compte pour violation des présentes CGU.
• Fournir des informations exactes, complètes et à jour lors de l'inscription.

L'Utilisateur est seul responsable de la confidentialité de ses identifiants de connexion (adresse e-mail et mot de passe). Il s'engage à ne pas les partager, à utiliser un mot de passe robuste et à notifier Atlas Studio sans délai en cas de suspicion d'utilisation non autorisée de son compte.

Atlas Studio se réserve le droit de suspendre ou supprimer tout compte dont les informations d'inscription s'avèrent inexactes ou frauduleuses, après en avoir informé l'Utilisateur dans la mesure du possible.

04. APPLICATIONS COUVERTES ET CONDITIONS SPÉCIFIQUES

Les présentes CGU s'appliquent à l'ensemble du portefeuille Atlas Studio, notamment :
• Atlas Finance
• Atlas Lease
• AtlasTrade
• DueDeck
• TableSmart
• WiseHR
• WiseFM
• CashPilot
• LiassPilot
• Scrutix
• ADVIST
• DocJourney

Précisions par catégorie :

Applications comptables et fiscales (Atlas Finance, LiassPilot) : Ces Applications produisent des états financiers et liasses fiscales SYSCOHADA à titre d'aide à la décision. Elles ne sauraient remplacer le conseil d'un expert-comptable agréé. L'Utilisateur demeure seul responsable de la conformité de ses obligations déclaratives.

Applications d'audit et due diligence (DueDeck, Scrutix) : Les analyses et scores générés constituent des outils d'aide à la décision et non des certifications. Atlas Studio ne saurait être tenu responsable des décisions d'investissement fondées sur ces outputs.

Applications de restauration (TableSmart) : L'Utilisateur est responsable de l'exactitude des menus, prix et allergènes publiés sur son interface client.

Applications documentaires et e-signature (ADVIST, DocJourney) : La valeur juridique des signatures électroniques dépend du cadre légal applicable dans la juridiction de l'Utilisateur. Atlas Studio ne garantit pas leur reconnaissance universelle.

05. PÉRIODE D'ESSAI GRATUIT

Atlas Studio propose une période d'essai gratuit de 14 (quatorze) jours à compter de la création du compte, sans engagement ni obligation de paiement pendant cette période.

Conditions de la période d'essai :
• La période d'essai est limitée à une (1) occurrence par Utilisateur, par entreprise et par Application. Toute tentative de multiplier les périodes d'essai via plusieurs comptes est interdite.
• L'accès est limité aux fonctionnalités définies par Atlas Studio pour chaque Application lors de la période d'essai (accès complet ou fonctionnalités restreintes selon l'Application).
• À l'expiration de la période d'essai, l'accès est automatiquement suspendu, sauf souscription à un Plan payant.
• Les Données saisies pendant l'essai sont conservées pendant 30 jours après expiration, puis supprimées définitivement sauf souscription active.

Atlas Studio se réserve le droit de modifier la durée ou les conditions de la période d'essai à tout moment, sans que cela n'affecte les essais en cours.

06. ABONNEMENTS ET PAIEMENTS

L'accès aux Applications au-delà de la période d'essai est conditionné à la souscription d'un Abonnement payant correspondant au Plan choisi par l'Utilisateur.

Facturation :
• Les Abonnements sont facturés mensuellement ou annuellement selon le cycle choisi lors de la souscription.
• Les tarifs sont exprimés en Francs CFA (XOF), toutes taxes et prélèvements obligatoires applicables inclus ou exclus selon la mention portée sur la facture.
• La facturation débute à compter de la date d'activation du Plan payant et se renouvelle automatiquement à chaque échéance.
• Toute période d'Abonnement entamée est due dans son intégralité.

Moyens de paiement acceptés :
• Mobile Money — Orange Money, MTN MoMo, Wave, Moov Money (principal).
• Carte bancaire — Visa, Mastercard (via CinetPay / Stripe).
• Virement bancaire — BCEAO, sur demande, plans Enterprise uniquement (sur devis).

En cas d'échec de paiement, Atlas Studio notifie l'Utilisateur par e-mail. Sans régularisation dans un délai de 7 (sept) jours calendaires, l'accès aux Applications peut être suspendu. Sans régularisation sous 30 (trente) jours, le compte peut être résilié conformément à l'article 14.

Atlas Studio se réserve le droit de modifier ses tarifs avec un préavis de 30 jours communiqué par e-mail. Les modifications tarifaires prennent effet à la prochaine échéance de renouvellement de l'Abonnement.

Changement de plan : La montée en gamme (upgrade) prend effet immédiatement et donne lieu à une facturation au prorata. La descente en gamme (downgrade) prend effet à la prochaine échéance de facturation. Atlas Studio ne saurait être responsable de la perte d'accès à des fonctionnalités en cas de downgrade.

07. CODES PROMOTIONNELS

Atlas Studio peut, à sa discrétion, émettre des codes promotionnels (réduction, mois offerts, accès étendu).
• Les codes promotionnels sont strictement personnels et non cessibles, sauf mention contraire explicite.
• Chaque code est à usage unique par compte, sauf indication contraire.
• Les codes ont une date d'expiration mentionnée lors de leur émission.
• Ils ne peuvent être cumulés avec d'autres offres promotionnelles, sauf autorisation expresse d'Atlas Studio.
• Atlas Studio se réserve le droit d'invalider tout code obtenu ou utilisé de manière frauduleuse, sans préavis.
• Les codes promotionnels ne confèrent aucun droit acquis et ne peuvent faire l'objet d'un échange contre une contrepartie financière.

08. REMBOURSEMENTS

En tant que service SaaS, les Abonnements ne donnent pas lieu à remboursement une fois la période de facturation entamée, sauf dans les cas suivants :
• Double facturation ou erreur technique : Remboursement intégral dans un délai de 10 jours ouvrables sur justification.
• Indisponibilité prolongée : En cas de dépassement de l'engagement de disponibilité défini à l'article 12, un avoir ou remboursement au prorata peut être accordé selon les modalités SLA.
• Plans annuels (dans les 14 premiers jours) : Un remboursement au prorata peut être accordé sur demande motivée adressée à support@atlas-studio.org, à la seule discrétion d'Atlas Studio.

Toute demande de remboursement doit être adressée par e-mail à support@atlas-studio.org avec l'objet « Demande de remboursement – [numéro de compte] ».

09. USAGES ACCEPTABLES ET INTERDITS

L'Utilisateur s'engage à utiliser les Applications exclusivement pour des finalités professionnelles légitimes, conformément aux lois et réglementations ivoiriennes et OHADA applicables.

Sont expressément interdits :
• Saisir, traiter ou stocker des données illicites, frauduleuses, diffamatoires ou portant atteinte à des droits de tiers.
• Utiliser les Applications pour blanchir des capitaux, financer le terrorisme ou se soustraire à toute obligation fiscale ou réglementaire.
• Tenter de contourner les mécanismes d'authentification, d'accéder à des données d'autres Utilisateurs ou de réaliser une ingénierie inverse des Applications.
• Automatiser l'accès aux Applications par des bots, scripts ou procédés non autorisés au-delà des API officiellement documentées par Atlas Studio.
• Sous-licencier, revendre ou mettre à disposition les Applications à des tiers sans accord écrit préalable d'Atlas Studio.
• Publier des contenus portant atteinte à l'image d'Atlas Studio, de ses employés ou de ses partenaires.
• Surcharger intentionnellement les infrastructures d'Atlas Studio ou mener des attaques de type déni de service.

Tout manquement à ces obligations peut entraîner la suspension immédiate du compte, sans préavis et sans droit à remboursement, conformément à l'article 14.

10. PROPRIÉTÉ INTELLECTUELLE

Atlas Studio est et demeure le seul et unique propriétaire de l'ensemble des droits de propriété intellectuelle afférents aux Applications : code source, interfaces, algorithmes, bases de données, documentation, marques, logos, et tout élément constitutif des Applications.

L'Abonnement confère à l'Utilisateur une licence d'utilisation personnelle, non exclusive, non transférable et révocable sur les Applications, limitée à la durée de l'Abonnement actif et au seul usage interne de l'entité abonnée.

Toute reproduction, adaptation, traduction, représentation ou diffusion, même partielle, des Applications ou de leur documentation, est strictement interdite sans l'accord écrit préalable d'Atlas Studio.

L'Utilisateur conserve l'intégralité de ses droits sur les Données qu'il saisit dans les Applications. En aucun cas, Atlas Studio ne revendique la propriété des Données de l'Utilisateur.

11. PROPRIÉTÉ ET PROTECTION DES DONNÉES PERSONNELLES

L'Utilisateur est propriétaire de toutes les Données saisies dans les Applications. Atlas Studio agit en qualité de sous-traitant au sens de la réglementation applicable à la protection des données personnelles.

Engagements d'Atlas Studio :
• Non-commercialisation : Les Données ne sont jamais vendues, louées ou échangées à des fins commerciales.
• Non-partage : Les Données ne sont transmises à des tiers qu'avec le consentement explicite de l'Utilisateur ou dans le cadre d'une obligation légale.
• Hébergement sécurisé : Les Données sont hébergées sur des serveurs sécurisés conformes aux standards de l'industrie (chiffrement au repos et en transit).
• Droit d'accès et portabilité : L'Utilisateur peut, à tout moment, exporter ses Données via les fonctions d'export disponibles dans les Applications, ou en faire la demande à support@atlas-studio.org.
• Droit à l'effacement : En cas de résiliation, les Données sont conservées pendant 90 jours puis supprimées définitivement, sauf obligation légale de conservation.

Les Applications traitant des données financières SYSCOHADA, Atlas Studio applique des mesures de sécurité renforcées conformes aux recommandations de l'ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire) et aux standards ISO 27001.

Une Politique de Confidentialité détaillée, accessible sur atlas-studio.org/confidentialite, complète les présentes CGU et précise les finalités, durées de traitement et droits des personnes concernées.

12. DISPONIBILITÉ ET NIVEAUX DE SERVICE (SLA)

• Starter / Pro : disponibilité 99,5 % — maintenance planifiée dimanche 00h–06h (UTC) — notification préalable 48 heures.
• Business : disponibilité 99,7 % — maintenance planifiée dimanche 00h–04h (UTC) — notification préalable 72 heures.
• Enterprise : disponibilité 99,9 % — maintenance selon accord contractuel — notification préalable 7 jours ouvrables.

En cas de dépassement des seuils d'indisponibilité non planifiée sur un mois calendaire, l'Utilisateur peut solliciter un avoir calculé au prorata du temps d'indisponibilité excédentaire, dans la limite de 30 % du montant mensuel de son Abonnement.

Ces engagements ne s'appliquent pas aux interruptions dues à des causes extérieures à Atlas Studio (cf. article 15 — Force majeure), ni aux opérations de maintenance annoncées.

13. GARANTIES ET LIMITATION DE RESPONSABILITÉ

Les Applications sont fournies en l'état, avec les fonctionnalités disponibles au jour de la souscription. Atlas Studio s'engage à maintenir les Applications en conditions opérationnelles et à corriger les anomalies bloquantes dans des délais raisonnables.

Limitation de responsabilité — Atlas Studio ne saurait être tenu responsable :
• Des dommages indirects, immatériels ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser les Applications (perte de revenus, perte de données, manque à gagner, atteinte à la réputation).
• Des erreurs de saisie, d'interprétation ou d'utilisation des outputs produits par les Applications, notamment en matière comptable, fiscale ou financière.
• Des pertes de données imputables à l'Utilisateur (suppression volontaire, erreur de configuration).
• Des défaillances des opérateurs de télécommunications ou de paiement tiers (Mobile Money, Stripe, CinetPay).

En tout état de cause, la responsabilité totale d'Atlas Studio au titre d'un incident est plafonnée au montant des sommes effectivement versées par l'Utilisateur au cours des 3 (trois) derniers mois précédant ledit incident.

14. RÉSILIATION

Résiliation par l'Utilisateur : L'Utilisateur peut résilier son Abonnement à tout moment depuis son espace compte. La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement au prorata n'est accordé pour la période résiduelle.

Résiliation par Atlas Studio : Atlas Studio se réserve le droit de suspendre ou résilier un compte dans les cas suivants :
• Violation des CGU (article 9) : résiliation immédiate, sans préavis, sans remboursement.
• Non-paiement persistant au-delà de 30 jours après relance : résiliation après notification par e-mail.
• Demande d'autorités compétentes dans le cadre d'une procédure légale : résiliation immédiate.
• Cessation d'activité d'Atlas Studio : préavis de 90 jours avec export des Données possible.

À la date effective de résiliation, l'accès aux Applications est désactivé. Les Données sont conservées pendant 90 jours puis définitivement supprimées, sauf obligation légale de conservation plus longue.

15. FORCE MAJEURE

Atlas Studio ne saurait être tenu responsable des manquements à ses obligations contractuelles résultant d'un événement de force majeure au sens de l'article 170 de l'Acte Uniforme OHADA relatif au droit commercial général et de la jurisprudence ivoirienne applicable.

Sont notamment considérés comme des cas de force majeure : catastrophes naturelles, pandémies, coupures d'énergie nationales prolongées, cyberattaques de grande ampleur, décisions gouvernementales ou réglementaires imprévisibles, pannes majeures des infrastructures internet sous-régionales.

Atlas Studio s'engage à notifier l'Utilisateur dans les meilleurs délais et à mettre en œuvre tous les moyens raisonnables pour reprendre le service. Si l'interruption excède 15 (quinze) jours consécutifs, chaque partie peut résilier le contrat sans pénalités, avec remboursement au prorata de la période non consommée.

16. MODIFICATION DES CGU

Atlas Studio se réserve le droit de modifier les présentes CGU à tout moment pour tenir compte de l'évolution réglementaire, de nouvelles Applications ou de l'amélioration des services.

Toute modification substantielle est notifiée à l'Utilisateur par e-mail au moins 30 jours avant son entrée en vigueur. La date de version en haut du document permet d'identifier la version applicable.

Si l'Utilisateur refuse les nouvelles CGU, il doit résilier son Abonnement avant la date d'entrée en vigueur des modifications. La poursuite de l'utilisation des Applications après cette date vaut acceptation tacite des nouvelles conditions.

Les modifications mineures (corrections typographiques, précisions rédactionnelles n'affectant pas les droits des parties) peuvent être apportées sans préavis.

17. DROIT APPLICABLE, MÉDIATION ET RÈGLEMENT DES LITIGES

Les présentes CGU sont régies par le droit ivoirien et, le cas échéant, par le droit uniforme OHADA applicable à Abidjan, Côte d'Ivoire.

Procédure de résolution amiable : En cas de litige, l'Utilisateur est invité à adresser une réclamation écrite à legal@atlas-studio.org. Atlas Studio s'engage à répondre dans un délai de 15 jours ouvrables. Les parties s'engagent à rechercher une solution amiable de bonne foi avant tout recours judiciaire.

Médiation : À défaut de résolution amiable dans un délai de 30 jours, les parties peuvent convenir de soumettre le litige à un médiateur agréé par le Centre d'Arbitrage, de Médiation et de Conciliation de Côte d'Ivoire (CACI) ou à la Cour Commune de Justice et d'Arbitrage (CCJA) de l'OHADA pour les litiges transfrontaliers.

Juridiction compétente : À défaut de résolution amiable ou par médiation, tout litige sera porté devant les tribunaux compétents d'Abidjan, nonobstant pluralité de défendeurs ou appel en garantie, même pour les procédures d'urgence ou les procédures conservatoires.

18. DISPOSITIONS DIVERSES

Intégralité de l'accord : Les présentes CGU, complétées par la Politique de Confidentialité et les éventuelles Conditions Particulières, constituent l'intégralité de l'accord entre les parties et annulent tout accord antérieur.

Divisibilité : Si une disposition des présentes CGU était déclarée nulle ou inapplicable par une juridiction compétente, les autres dispositions demeurent pleinement en vigueur.

Absence de renonciation : Le fait pour Atlas Studio de ne pas se prévaloir d'un manquement de l'Utilisateur à l'une quelconque de ses obligations ne saurait être interprété comme une renonciation à s'en prévaloir ultérieurement.

Langue : Les présentes CGU sont rédigées en langue française. En cas de traduction dans une autre langue, la version française prévaut.

Contact : Pour toute question relative aux présentes CGU : legal@atlas-studio.org

Atlas Studio · Abidjan, Côte d'Ivoire · atlas-studio.org$cgu_fr$ AS content
)
INSERT INTO atlasbanx.policy_versions (policy_type, version, content, content_hash, language, published_at)
SELECT 'cgu', '2026-07-25', content, encode(sha256(content::bytea), 'hex'), 'fr', NOW()
  FROM new_cgu
ON CONFLICT (policy_type, version, language)
DO UPDATE SET content       = EXCLUDED.content,
              content_hash  = EXCLUDED.content_hash,
              published_at   = NOW(),
              superseded_at  = NULL;
