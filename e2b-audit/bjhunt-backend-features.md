# BJHUNT 4 MAX — Fonctionnalités Plateforme

## Sécurité & Conformité

### Isolation multi-locataire renforcée (Row-Level Security)
Chaque organisation bénéficie d'une isolation stricte au niveau base de données : aucune donnée ne peut fuir entre locataires, même en cas d'erreur applicative. Le système fonctionne en mode « zéro confiance » — toute requête est automatiquement filtrée par le contexte organisationnel de l'utilisateur authentifié, sans exception.

### Authentification multi-facteurs
Connexion par email/mot de passe avec couche 2FA obligatoire au choix : TOTP (applications d'authentification) ou WebAuthn (clés de sécurité physiques, biométrie). Les sessions sont traçables par IP et user-agent avec révocation sélective.

### Journal d'audit immuable
Chaque action significative (création d'audit, modification de périmètre, partage, suppression, connexion, export) est horodatée et consignée de manière append-only. Les entrées d'audit survivent à la suppression des objets source — garantissant une piste d'audit complète pour les audits de conformité SOC 2 et ISO 27001.

### Contrôle d'accès granulaire par rôles
Six niveaux de permissions : Owner, Admin, Lead, Operator, Member, Viewer. Un opérateur peut lancer des audits mais ne peut pas les supprimer ; un viewer ne peut que lire. La destruction d'audit est réservée aux rôles Lead et supérieurs.

### Détection de violation de périmètre (Scope Guard)
Le système monitorise en temps réel chaque action de l'IA contre le mandat signé. Toute action hors périmètre (cible non autorisée, méthode interdite) est bloquée avant exécution et consignée comme événement dédié. Le mandat est modifiable en cours d'audit — la mise à jour prend effet immédiatement sans redémarrage.

### Dissimulation de l'infrastructure (NDA Redactor)
Un filtre de sortie applique 70+ règles de réécriture sur chaque fragment de texte, finding et preuve transitant vers l'utilisateur. Les noms d'outils internes, fournisseurs LLM, adresses IP, chemins de fichiers et noms d'infrastructure sont systématiquement remplacés — l'opérateur ne voit jamais la stack sous-jacente.

### Chiffrement des preuves
Les preuves capturées sont stockées avec chiffrement SSE-C par engagement, avec chaîne de hachage (hash chain) garantissant l'intégrité séquentielle. Chaque fichier est vérifié par SHA-256.

---

## Moteur d'Audit Offensif

### 24 agents spécialisés
Un coordinateur IA pilote jusqu'à 24 agents spécialisés en simultané : OSINT recon, web recon, scan réseau, pentest web/API/auth, cloud (AWS, GCP, Azure, Kubernetes), Active Directory, mobile (Android, iOS), sans-fil, ingénierie sociale, développement d'exploits, post-exploitation, forensic, gestion des preuves, scoring de risque, et reporting conformité.

### Orchestration multi-agents avec handoff
Les agents se transmettent le relais de manière coordonnée — l'OSINT passe au web recon qui passe au pentester. Chaque transition est un événement dédié (agent.handoff) avec justification visible en temps réel.

### Modèles IA interchangeables
15+ modèles disponibles par agent : chaque agent peut utiliser un modèle différent optimisé pour sa tâche. Inclut des modèles de raisonnement avancé, de génération de code, et un modèle fine-tuné pour le pentest. Changement de modèle en cours d'audit sans redémarrage.

### Connaissance situationnelle (Dream Diary)
Le système maintient un journal narratif en arrière-plan documentant les hypothèses, déductions et stratégies de chaque agent — annexé automatiquement au rapport de synthèse exécutive.

### Suggestions contextuelles dynamiques
Après chaque tour de conversation, l'IA propose 3 actions de suivi contextualisées au périmètre et aux frameworks sélectionnés — pas des suggestions génériques mais des recommandations opérationnelles ciblées.

---

## Conformité Réglementaire

### 14 frameworks couverts
PCI-DSS v4.0, ISO/IEC 27001:2022, SOC 2 Type II, NIST CSF 2.0, NIST SP 800-53 rev5, OWASP ASVS (3 niveaux), OWASP Top 10, HIPAA Security Rule, RGPD/GDPR, NIS2, DORA, CIS Benchmarks, MITRE ATT&CK, et Synthèse Exécutive BJHUNT.

### Agents de reporting dédiés par framework
Chaque framework dispose d'un agent dédié qui génère un rapport structuré couvrant les exigences spécifiques. Plusieurs frameworks peuvent être ciblés simultanément dans un seul audit.

### Scoring multi-dimensionnel
Chaque finding est scoré avec CVSS v4 (vecteur + score), EPSS (probabilité d'exploitation), statut KEV (CISA Known Exploited Vulnerabilities), et DREAD — avec impact métier personnalisable.

### Mapping automatique des findings
Chaque vulnérabilité identifiée est automatiquement mappée aux contrôles des frameworks cibles — OWASP ASVS 5.3.1, PCI-DSS Req 6.5, NIST 800-53 SI-10, etc.

### Niveaux ASVS configurables
OWASP ASVS supporte les 3 niveaux de vérification (L1 fondamental, L2 standard, L3 avancé) sélectionnable par audit.

---

## Streaming & Collaboration

### Streaming temps réel (12 événements typés)
Flux bidirectionnel en temps réel : lancement/arrêt de run, pensée de l'agent (streaming), appels et résultats d'outils, findings, captures de preuves, transferts entre agents, progression, mises à jour du canvas collaboratif, violations de périmètre, et erreurs d'exécution. Chaque événement est horodaté ULID et persisté pour relecture.

### Canvas collaboratif
Document Markdown partagé entre l'opérateur et l'IA, avec gestion de conflits par révision. L'IA rédige des sections de rapport en temps réel ; l'opérateur peut modifier et les deux sources convergent. Limite de 256 Ko (~30 pages).

### Partage sécurisé
Création de liens de partage temporaires (1 jour à 365 jours) protégés par mot de passe optionnel (scrypt 256-bit). Trois niveaux de visibilité : chat complet, finding spécifique, ou rapport. Compteur de vues et révocation instantanée.

### Branchement d'audit
Duplication d'un audit existant avec tout l'historique — pour changer de framework compliance sans perdre le travail de recon/scan déjà effectué.

### Relecture complète après clôture
Pour les audits terminés, l'intégralité de l'historique (5000 événements max) est accessible en une seule requête JSON — permettant de reconstituer fidèlement chaque étape.

---

## Gestion des Engagements

### Mandat signé électroniquement
Chaque audit est créé avec un mandat signé numériquement (horodatage serveur, identité de l'opérateur). Le mandat définit le périmètre in-scope/out-of-scope, les règles d'engagement, les plages horaires autorisées et le débit maximum (RPS).

### Sandbox éphémère à la demande (Lazy Kali)
L'environnement d'audit n'est provisionné que lorsque l'IA décide d'exécuter des outils — réduisant les coûts de ~0,50 USD par session pour les conversations exploratoires. La destruction est automatique après inactivité.

### Régénération avec changement de modèle
Relancez le dernier tour avec un modèle différent — comme sur ChatGPT « Try again with GPT-4o ». L'idempotence est garantie par clé Redis.

### Cycle de vie complet
Brouillon → En attente → Actif → En veille → Terminé / Abandonné / Échéu / Expiré. Les audits en veille se réactivent automatiquement à l'envoi d'un message avec respawn transparent du sandbox.

### Recherche plein texte
Recherche dans les titres d'audit et le contenu des messages — avec snippet contextuel pour navigation directe vers le message ciblé.

---

## Rapports & Preuves

### Rapports Markdown générés automatiquement
Rapport structuré incluant : page de titre, histogramme de sévérité, tableau des findings triés par CVSS, détail par finding (reproduction, impact, remédiation, mapping compliance), et mentions légales. Généré par commande `/report` dans le chat.

### Catalogue des preuves capturées
Chaque preuve (stdout, fichier, screenshot, capture réseau) est stockée avec SHA-256, taille, statut de troncation, traçabilité de l'agent, et URL de stockage chiffré. Les données sensibles sont automatiquement rédactées.

### Export RGPD
Demande d'export complète des données (JSON) avec traitement dans les 24h. Suppression de compte avec validation SOC humaine sous 7 jours.

---

## Administration & Utilisation

### Dashboard statistiques
Nombre total d'utilisateurs, audits actifs, appels API quotidiens, tokens consommés, temps de réponse moyen, taux d'erreur 24h, stockage utilisé, et uptime — tout scoped à l'organisation.

### Gestion des clés API
Clés scopingées avec préfixe identifiable, hachage sécurisé, date d'expiration, révocation instantanée, et traçabilité de dernière utilisation (IP, horodatage).

### Gestion des sessions actives
Liste et révocation sélective des sessions BetterAuth — en cas de compromission, déconnectez un appareil sans affecter les autres.

### Préférences utilisateur enrichies
Nom d'affichage, locale (FR/EN), thème (sombre/clair/système), modèle par défaut, frameworks compliance par défaut, ton de l'agent (neutre/formel/amical/direct), instructions personnalisées, activation/désactivation de la mémoire, et opt-out d'entraînement des données.

### Limites configurables par plan
Maximum d'audits parallèles, délai de rétention des données (30 à 2555 jours), taille maximale des preuves, et limites de débit — tout paramétrable au niveau organisation.

---

## Tarification & Plans

### Starter — Gratuit
5 audits, 1M tokens, agents offensifs standards, rapport exécutif, sandbox éphémère. Idéal pour l'évaluation et les audits ponctuels.

### Standard — 199 EUR/mois
100 audits, 50M tokens, 24 agents spécialisés, 14 frameworks compliance, partage sécurisé, canvas collaboratif, recherche plein texte, export RGPD, clés API, 3 sandbox simultanés.

### Enterprise — 999 EUR/mois
Audits illimités, tokens illimités, SSO/SAML, conformité DORA TLPT, rétention personnalisée, SLA garanti, support dédié, rapports PKCS#7 signés avec horodatage RFC 3161.

---

## Différenciateurs Clés

1. **Isolation zéro confiance** — Pas de bypass possible, même par erreur applicative. Chaque requête est scoped par organisation.

2. **Scope Guard en temps réel** — L'IA ne peut jamais agir hors mandat. Chaque tentative de violation est bloquée et journalisée avant exécution.

3. **Lazy Kali** — Le sandbox d'audit n'est provisionné que quand l'IA a besoin d'exécuter des outils. Économie de 0,50 USD+ par session exploratoire.

4. **Branchement d'audit** — Dupliquez un auditInProgress pour changer de framework compliance sans repartir de zéro. Tout l'historique est préservé.

5. **24 agents, 14 frameworks** — La couverture compliance la plus large du marché dans un seul audit simultané.

6. **Dissimulation systématique de la stack** — 70+ règles de réécriture garantissent que l'utilisateur final ne voit jamais les fournisseurs, modèles, IPs, ni les noms d'outils internes.

7. **Mandat signé électroniquement** — Chaque audit est créé avec un mandat horodaté et signé, définissant le périmètre autorisé. Pas de zone grise.

8. **Journal d'audit append-only** — Les entrées survivent à la suppression des objets source. Conçu pour les audits SOC 2 et ISO 27001.

9. **Régénération multi-modèle** — Changez de modèle IA en cours d'audit sans perdre le contexte. Un seul clic pour relancer avec un modèle de raisonnement différent.

10. **Scoring CVSS v4 natif** — Plus précis que CVSS v3, avec EPSS et KEV intégrés, et mapping automatique aux frameworks compliance.