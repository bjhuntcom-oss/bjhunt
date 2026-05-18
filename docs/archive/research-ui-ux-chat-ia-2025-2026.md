# Recherche UI/UX — Interfaces de Chat IA Modernes (2025-2026)
## Priorisé pour un produit B2B Sécurité (Audits Pentest)

**Date de synthèse :** 2026-05-13  
**Sources :** Docs OpenAI (Streaming, Reasoning, Voice Mode, ChatKit), Anthropic (Claude Opus 4.7, Claude Design), Gemini, Hacker News, UX patterns observés sur ChatGPT, Claude.ai, Gemini Advanced.

---

## Légende des priorités

| Priorité | Définition | Justification B2B Sécurité |
|---|---|---|
| **MUST-HAVE** | Fonctionnalité critique pour la mission, la confiance ou la compliance. Bloquante si absente. | Traçabilité, reproductibilité des audits, contrôle de la génération, accessibilité légale. |
| **NICE-TO-HAVE** | Améliore significativement l'expérience mais n'est pas bloquante pour le cœur de métier. | Productivité secondaire, confort visuel, options de personnalisation. |
| **CUTTING-EDGE** | Fonctionnalité émergente 2025-2026, souvent complexe à implémenter, à évaluer selon la maturité du produit. | Différenciation concurrentielle, mais risque de dette technique ou de distraction UX. |

---

## 1. COMPOSER (Input Area)

### 1.1. Multi-line Text Input with Auto-resize
- **Comportement exact :** Zone de saisie qui s'agrandit verticalement (jusqu'à une hauteur max, ex: 300px) à mesure que l'utilisateur tape des retours à la ligne. Shift+Enter pour saut de ligne, Enter pour envoi.
- **Déclencheurs :** Saisie de texte avec retour chariot. Retrait automatique lorsque le message est envoyé ou via bouton "Collapse".
- **Bonnes pratiques UX :** Garder le composer visible en bas d'écran (sticky). Limiter à ~8-10 lignes visibles avant scrollbar interne pour ne pas masquer l'historique. Afficher un compteur de caractères optionnel si limites de contexte.
- **Priorité :** **MUST-HAVE** — C'est le point d'entrée principal de l'audit ; une saisie mal dimensionnée rend le produit inutilisable pour les longues requêtes (pasting de logs, de code).

### 1.2. Send Button States (Active / Disabled / Loading)
- **Comportement exact :** Le bouton d'envoi est grisé/désactivé quand l'input est vide. Il passe en état actif (couleur primaire) dès qu'un caractère est saisi. Pendant la génération de la réponse, il se transforme en bouton **Stop** (souvent carré ou icône carrée rouge/noire).
- **Déclencheurs :** `input.length === 0` → disabled ; `input.length > 0` → active ; `stream.status === 'in_progress'` → Stop.
- **Bonnes pratiques UX :** Ne jamais cacher le bouton ; transformer l'icône "Send" en "Stop" avec une transition fluide (morphing SVG). Maintenir la même hitbox pour éviter les miss-clicks. En B2B, le Stop est critique pour couper une génération hallucinée ou trop longue.
- **Priorité :** **MUST-HAVE** — Le bouton Stop est un levier de contrôle de confiance absolu pour les utilisateurs techniques.

### 1.3. File Upload Drag & Drop
- **Comportement exact :** L'utilisateur peut cliquer sur un bouton "Attach" ou glisser-déposer un/des fichier(s) directement sur la zone de composer ou sur toute la fenêtre de chat. Une fois uploadé, une vignette (chip) avec le nom du fichier et sa taille apparaît dans l'input area. Support multi-fichiers.
- **Déclencheurs :** `dragenter`/`dragover` sur la fenêtre → overlay visuel (bordure en pointillés ou fond légèrement coloré). `drop` → début de l'upload avec barre de progression mini sur la chip. Click sur le bouton attach → ouverture du file picker natif.
- **Bonnes pratiques UX :** Accepter les formats pertinents (txt, pdf, csv, json, log, code source). Afficher une erreur claire si le format ou la taille est rejetée (ex: "Fichier trop volumineux — max 10 Mo"). Permettre la suppression d'un fichier attaché avant envoi (croix sur la chip). Pour la sécurité, afficher un hash ou un aperçu du contenu si pertinent.
- **Priorité :** **MUST-HAVE** — Les audits pentest manipulent constamment des fichiers (logs, rapports Nmap, fichiers de config, captures d'écran). Sans upload fluide, le produit est inefficace.

### 1.4. Image Paste & Clipboard Upload
- **Comportement exact :** Coller (`Ctrl+V`) une image depuis le presse-papiers (screenshot) directement dans le champ de saisie. L'image est convertie en fichier et affichée comme vignette d'aperçu (thumbnail) dans le composer.
- **Déclencheurs :** Événement `paste` avec `clipboardData.files` ou `clipboardData.items` de type image. Détection côté client.
- **Bonnes pratiques UX :** Redimensionner l'aperçu à une taille fixe (ex: 80x80px) avec possibilité de suppression. Afficher un tooltip "Coller une image" sur le bouton attach. Ne pas perdre le focus du textarea lors du collage.
- **Priorité :** **NICE-TO-HAVE** — Utile pour coller des screenshots de vulnérabilités, mais le drag & drop fichier couvre 90% des besoins. À implémenter si l'équipe a du temps.

### 1.5. Slash Commands & Quick Actions
- **Comportement exact :** L'utilisateur tape `/` dans le composer et un menu autocomplete apparaît avec des commandes prédéfinies (ex: `/audit`, `/explain`, `/compare`, `/reset`). Chaque commande a une description et éventuellement des arguments.
- **Déclencheurs :** Touche `/` en début de ligne (ou n'importe où selon l'implémentation). Filtre dynamique selon la saisie.
- **Bonnes pratiques UX :** Utiliser le raccourci clavier `↑↓` pour naviguer, `Enter` pour sélectionner, `Escape` pour fermer. Garder le menu limité à 5-7 items visibles avec scroll interne. Afficher une tooltip de preview de ce que la commande va faire. En B2B sécurité, cela standardise les workflows d'audit.
- **Priorité :** **NICE-TO-HAVE** — Excellent pour standardiser les prompts d'audit, mais peut être remplacé par des templates côté UI (boutons) pour plus de clarté.

### 1.6. @Mentions (Agents / Context / Users)
- **Comportement exact :** Tape `@` pour invoquer un agent spécifique, un contexte (base de connaissances), ou un utilisateur (en mode collaboratif). Déclenche un picker avec avatar + nom + rôle.
- **Déclencheurs :** `@` suivi de caractères alphanumériques. Fermeture automatique si espace ou ponctuation.
- **Bonnes pratiques UX :** Colorer la mention avec un badge distinct une fois sélectionnée. Permettre la suppression avec Backspace comme un bloc unique. Indiquer clairement si la mention cible un "agent" (IA) ou un "outil" (RAG, sandbox).
- **Priorité :** **CUTTING-EDGE** — Puissant pour les multi-agent workflows (ex: @scanner, @reporter), mais complexe à implémenter. Pertinent seulement si le produit évolue vers une orchestration multi-personas.

### 1.7. Model Picker Placement
- **Comportement exact :** Sélecteur de modèle (ex: GPT-5.4, GPT-5.5, Claude Sonnet, etc.) accessible depuis le composer ou la barre d'en-tête du thread. ChatGPT le place dans le coin inférieur gauche ou dans un menu déroulant au-dessus du composer. Anthropic utilise un sélecteur discret en haut.
- **Déclencheurs :** Click sur le nom du modèle actuel. Changement via dropdown.
- **Bonnes pratiques UX :** En B2B, éviter le "model roulette". Préférer un sélecteur **global** en header pour l'ensemble du workspace plutôt que par message, afin de garantir la cohérence des résultats d'audit. Si par message, indiquer visuellement dans chaque bulle quel modèle a été utilisé.
- **Priorité :** **MUST-HAVE** — En B2B sécurité, la traçabilité du modèle utilisé pour chaque réponse est un élément de confiance et de reproductibilité.

### 1.8. Expand / Collapse Composer
- **Comportement exact :** Un bouton (souvent une flèche ou un double-chevron) permet d'agrandir la zone de saisie en plein écran ou demi-écran (mode "focus" / "zen") pour rédiger des prompts longs. Réduire revient à la vue compacte.
- **Déclencheurs :** Click sur l'icône d'agrandissement. Raccourci clavier optionnel (`Ctrl+Shift+E`).
- **Bonnes pratiques UX :** L'expansion doit être non-modale (overlay en bas de l'écran ou split-pane) pour garder le contexte du thread visible. Garder le fond légèrement obscurci. En mode expand, afficher une preview live du rendu markdown.
- **Priorité :** **NICE-TO-HAVE** — Confort pour les prompts longs, mais l'auto-resize (1.1) couvre l'essentiel.

### 1.9. Formatting Toolbar (Markdown Shortcuts)
- **Comportement exact :** Petite barre d'outils flottante au-dessus ou au-dessous du composer avec des boutons pour le gras, le code inline, la liste, le bloc de code. Cliquer formate le texte sélectionné ou insère des backticks.
- **Déclencheurs :** Sélection de texte dans le textarea (apparition d'une tooltip bar/bubble). Hover sur le composer.
- **Bonnes pratiques UX :** Support des raccourcis clavier natifs (`Ctrl+B`, `` Ctrl+` ``). La barre doit disparaître dès que le texte est désélectionné. Ne pas encombrer l'UI ; 4-5 icônes maximum.
- **Priorité :** **NICE-TO-HAVE** — Les utilisateurs techniques connaissent le markdown. Un aide-mémoire visuel peut aider les juniors.

### 1.10. Emoji Picker
- **Comportement exact :** Bouton smiley dans le composer ouvrant un picker d'emoji/catégories.
- **Déclencheurs :** Click sur l'icône smiley. Raccourci `:` suivi de texte pour autocomplete.
- **Bonnes pratiques UX :** Peu pertinent en B2B sécurité. Si présent, le limiter aux emojis standards et éviter les animations lourdes.
- **Priorité :** **CUTTING-EDGE / À EXCLURE** — Non pertinent pour un outil d'audit sécurité. Peut même nuire à la perception de sérieux.

### 1.11. Voice Input / Dictation
- **Comportement exact :** Bouton micro dans le composer. Pression longue ou click simple pour activer la reconnaissance vocale (STT). Le texte transcrit apparaît en temps réel dans l'input. Indication visuelle d'état ("Écoute..."). Double-check de la transcription avant envoi.
- **Déclencheurs :** Click/pression sur l'icône micro. Permission navigateur `microphone`. Support Web Speech API ou backend Whisper.
- **Bonnes pratiques UX :** Afficher une onde sonore animée pendant l'écoute. Permettre l'annulation avant envoi automatique. En B2B, les utilisateurs dictent rarement des commandes techniques complexes ; privilégier le texte.
- **Priorité :** **NICE-TO-HAVE** — Peut servir pour des notes rapides post-audit, mais le texte reste le medium principal de la sécurité.

---

## 2. STREAMING / GÉNÉRATION

### 2.1. Streaming Text with Typing Indicator (Caret Blink)
- **Comportement exact :** Le texte de l'assistant apparaît token par token, simulant une frappe. Un curseur clignotant (caret) vertical suit la dernière position de caractère inséré. Le caret disparaît une fois la génération terminée.
- **Déclencheurs :** `stream=true` côté API. Réception d'événements SSE (`response.output_text.delta`).
- **Bonnes pratiques UX :** Utiliser un caret de couleur contrastée (ex: bleu primaire) mais discret. Ne pas faire scintiller trop vite (0.8s de cycle). Le caret doit être exactement à la hauteur de la ligne de texte. **Crucial :** le caret ne doit pas provoquer de layout shift ; utiliser `position: absolute` ou un span inline dédié.
- **Priorité :** **MUST-HAVE** — Le streaming réduit drastiquement la perception de latence. En audit, cela permet de commencer à relire la réponse immédiatement.

### 2.2. Status Pills (Phases d'exécution)
- **Comportement exact :** Petit badge texte affiché au-dessus ou à côté de la bulle en cours de génération, indiquant l'étape active : "Réflexion...", "Recherche web...", "Analyse du fichier...", "Exécution du code...", "Rédaction...". Ces pills changent dynamiquement pendant le streaming.
- **Déclencheurs :** Réception d'événements spécifiques via SSE : `ResponseFileSearchCallSearching`, `ResponseCodeInterpreterInProgress`, `ResponseInProgressEvent`, ou custom events.
- **Bonnes pratiques UX :** Utiliser des verbes à l'infinitif ou participe présent ("Analyse en cours..."). Animer subtilement les pills (fade-in/fade-out ou pulse). Les aligner à gauche sous le header de la bulle assistant. ChatGPT utilise des pills sous forme de chips ; Claude utilise des pills textuels sobres.
- **Priorité :** **MUST-HAVE** — En B2B sécurité, savoir que l'agent est en train de "réfléchir" ou d'"exécuter du code dans le sandbox" rassure l'utilisateur et justifie la latence.

### 2.3. Skeleton Loader / Placeholder Blocks
- **Comportement exact :** Avant ou pendant les premiers tokens, afficher des blocs gris animés (shimmer) qui matérialisent la structure future de la réponse : quelques lignes de texte, un bloc de code, une liste. Disparaissent dès que le vrai contenu arrive.
- **Déclencheurs :** Envoi du message utilisateur → apparition du skeleton. Premier token reçu → retrait progressif du skeleton au profit du vrai texte.
- **Bonnes pratiques UX :** Le skeleton doit correspondre approximativement aux types de contenu attendus (ex: 3 lignes de texte + 1 rectangle de code). Éviter les skeletons trop longs qui créent des sauts de layout. Utiliser une animation CSS `shimmer` douce (gradient défilant).
- **Priorité :** **NICE-TO-HAVE** — Le caret de streaming suffit généralement. Le skeleton est utile si la latence "time to first token" est > 2s.

### 2.4. Partial Content Rendering (Markdown Live)
- **Comportement exact :** Le markdown est parsé et rendu en temps réel au fur et à mesure de l'arrivée des tokens. Les titres (`#`), le gras (`**`), les listes (`-`) s'appliquent dès que les caractères de syntaxe sont reçus. Les blocs de code sont rendus avec coloration syntaxique dès que le langage est détecté.
- **Déclencheurs :** Chaque événement `delta` déclenche un re-render partiel du composant markdown.
- **Bonnes pratiques UX :** Utiliser un parser markdown incrémental performant (ex: `micromark`, `react-markdown` avec memoization). Éviter le "flicker" des blocs de code en attendant la fermeture des backticks. Pour les blocs de code, appliquer la coloration syntaxique dès que la première ligne est détectée et ne pas la recalculer à chaque token.
- **Priorité :** **MUST-HAVE** — Pour relire du code ou des rapports d'audit en temps réel, le rendu markdown live est indispensable.

### 2.5. Tool Call UI (Function Calling Display)
- **Comportement exact :** Lorsque l'assistant appelle un outil (ex: exécution shell, recherche web, lecture fichier), l'interface affiche un composant distinct dans le thread : une "carte" repliée montrant le nom de l'outil, les arguments, et un indicateur de chargement. Une fois l'outil exécuté, la carte s'étend pour montrer le résultat (output) de manière formatée.
- **Déclencheurs :** Événements SSE `ResponseFunctionCallArgumentsDelta` / `ResponseFunctionCallArgumentsDone`, ou équivalent custom.
- **Bonnes pratiques UX :** Adopter le pattern "accordion" : état replié par défaut montrant uniquement l'action (ex: "🔧 Exécution de `nmap -sV`"), expandable au click. Colorer les arguments en mode "code". Pour les résultats d'outils de sécurité, afficher le stdout/stderr avec des couleurs distinctes (vert = succès, rouge = erreur). Permettre le copier-coller du résultat brut.
- **Priorité :** **MUST-HAVE** — En audit pentest, l'agent exécute des outils (scanner, interpréteur). L'utilisateur doit voir et vérifier chaque appel d'outil.

### 2.6. Reasoning / Thinking UI
- **Comportement exact :** Pour les modèles de raisonnement (o1, o3, GPT-5.5 avec `reasoning.effort`), afficher une section repliée (collapsible) au-dessus de la réponse finale intitulée "Chaîne de raisonnement", "Réflexion", ou "Thinking". Contient un résumé textuel de la réflexion interne du modèle. Non modifiable par l'utilisateur.
- **Déclencheurs :** Réception d'un output item de type `reasoning` avec un `summary` (si `summary: auto` est demandé). Ou affichage générique si le modèle est un reasoning model.
- **Bonnes pratiques UX :** Par défaut, replié (collapsed) pour ne pas submerger l'utilisateur. Icône "cervelle" ou "⚡" à côté du titre. Contenu en typographie plus petite et couleur grisée pour indiquer le caractère secondaire/méta. En B2B sécurité, permettre à l'utilisateur d'inspecter le raisonnement pour auditer la logique de l'agent.
- **Priorité :** **MUST-HAVE** — Pour un produit B2B sécurité, la transparence du raisonnement est un vecteur de confiance critique. Même un résumé simple est indispensable.

### 2.7. Code Block Streaming
- **Comportement exact :** Quand un bloc de code (triple backticks) est ouvert en streaming, l'interface bascule immédiatement en mode "code block" avec fond sombre, numéros de ligne, et coloration syntaxique. Le texte s'affiche ligne par ligne ou token par token à l'intérieur de ce bloc. La barre d'outils du bloc (copier, télécharger, langage) apparaît dès l'ouverture des backticks.
- **Déclencheurs :** Détection de la séquence `` ``` `` (ou `` ```python ``) dans le stream.
- **Bonnes pratiques UX :** Le bloc doit avoir une largeur fixe avec overflow-x auto pour éviter les débordements. Afficher le nom du langage détecté dans un petit badge en haut à droite. La coloration syntaxique doit être appliquée incrémentalement sans re-render complet (utiliser un tokenizer incrémental comme Prism ou Shiki avec streaming support).
- **Priorité :** **MUST-HAVE** — L'audit pentest produit massivement des extraits de code, de scripts et de configurations. La lisibilité du code en streaming est non négociable.

### 2.8. Stop / Cancel Generation
- **Comportement exact :** (Lié à 1.2) Bouton permettant d'interrompre le stream en cours. L'état partiel (tokens déjà reçus) est conservé dans le thread, marqué comme "interrompu". Le message assistant tronqué reste visible.
- **Déclencheurs :** Click sur le bouton Stop. Raccourci clavier `Escape`.
- **Bonnes pratiques UX :** Retour visuel immédiat : le caret disparaît, le statut passe à "Interrompu par l'utilisateur". Permettre de "Régénérer" ou "Continuer" depuis ce point. En B2B, un utilisateur doit pouvoir couper immédiatement une réponse qui part dans une mauvaise direction sans perdre le contexte déjà généré.
- **Priorité :** **MUST-HAVE** — Levier de contrôle fondamental.

---

## 3. MESSAGES / BUBBLES

### 3.1. User vs Assistant Styling
- **Comportement exact :** Les messages utilisateur et assistant sont différenciés par : couleur de fond (ex: utilisateur = couleur primaire/surface claire, assistant = fond neutre/blanc), alignement (utilisateur à droite ou pleine largeur à gauche selon le design), avatar/icône (utilisateur = initiales ou photo, assistant = logo/agent), et typographie.
- **Déclencheurs :** Constant selon le `role` du message.
- **Bonnes pratiques UX :** En B2B sécurité, privilégier un design "conversationnel mais professionnel" : messages pleine largeur, alignés à gauche tous les deux, différenciés par un trait vertical coloré ou un badge de rôle. Éviter le style "SMS bulles arrondies" qui réduit la densité d'information. Garder un padding généreux (16-20px) pour aérer le texte technique.
- **Priorité :** **MUST-HAVE** — Lisibilité et distinction des rôles sont la base de toute interface de chat.

### 3.2. Edit Message (User)
- **Comportement exact :** Au survol d'un message utilisateur, une icône "crayon" apparaît. Click dessus → le message se transforme en textarea pré-rempli. L'utilisateur modifie, puis valide (bouton ou Ctrl+Enter). L'interface supprime alors tous les messages suivants (l'historique est tronqué à ce point) et relance la génération à partir de la version éditée.
- **Déclencheurs :** Hover sur message user → apparition icône edit. Click icône → mode edit. Validation → troncature du thread + re-stream.
- **Bonnes pratiques UX :** Demander une confirmation si le thread contient plusieurs messages enfants (perte de contexte). Afficher un hint subtil : "Modifier ce message supprimera les réponses suivantes." Permettre d'annuler (Escape) sans effet. Conserver l'original dans un état "shadow" pendant l'édition.
- **Priorité :** **MUST-HAVE** — Essentiel pour corriger une requête d'audit sans perdre le contexte précédent. Très utilisé en itération technique.

### 3.3. Delete Message
- **Comportement exact :** Option "Supprimer" dans un menu "..." sur chaque bulle. Suppression d'un message unique ou de la paire message/réponse. Possibilité de suppression de tout le thread.
- **Déclencheurs :** Click sur menu contextuel (three dots) → Delete.
- **Bonnes pratiques UX :** Confirmer la suppression si action irréversible (modal ou toast avec undo pendant 5s). En B2B sécurité/compliance, la suppression doit être "soft delete" côté base (archivage) pour traçabilité, avec une vraie suppression accessible uniquement aux admins.
- **Priorité :** **MUST-HAVE** — RGPD / droit à l'effacement. Mais implémenter en soft-delete pour l'audit log.

### 3.4. Copy Code (Bloc de code)
- **Comportement exact :** Chaque bloc de code `<pre>` a un bouton "Copier" dans son header (coin supérieur droit). Click → copie le contenu brut dans le presse-papiers. Feedback visuel : icône check pendant 2s.
- **Déclencheurs :** Click sur le bouton copy. Hover sur le bloc de code → apparition/visibilité du bouton.
- **Bonnes pratiques UX :** Utiliser l'API `navigator.clipboard.writeText`. Afficher un toast "Copié dans le presse-papiers". En B2B, proposer aussi un bouton "Télécharger" (`.sh`, `.py`, `.json`) pour exporter directement le snippet.
- **Priorité :** **MUST-HAVE** — Les utilisateurs copient constamment des commandes et des scripts depuis l'IA vers leur terminal.

### 3.5. Copy Message (Texte complet)
- **Comportement exact :** Option dans le menu "..." de chaque bulle : "Copier le message". Copie le contenu textuel brut (markdown source) de la bulle.
- **Déclencheurs :** Menu contextuel.
- **Bonnes pratiques UX :** Copier le markdown source, pas le HTML rendu. Pour un message assistant contenant des outils, copier uniquement le texte visible ou proposer une option "Copier tout (incluant résultats outils)".
- **Priorité :** **MUST-HAVE** — Reproductibilité des rapports d'audit.

### 3.6. Regenerate / Branch Conversation
- **Comportement exact :** Après une réponse assistant, un bouton "Régénérer" (icône refresh) relance la génération pour le même prompt utilisateur, en créant une "branche" parallèle. L'interface permet de naviguer entre les différentes versions d'une réponse (ex: flèches `< 2 / 3 >`).
- **Déclencheurs :** Click sur "Régénérer". Génération terminée → apparition des contrôles de navigation entre branches.
- **Bonnes pratiques UX :** Afficher les branches comme des onglets discrets ou un carousel. Indiquer clairement quelle version est active. Conserver l'historique complet des branches côté backend. En B2B, permettre de "verrouiller" une version comme "réponse retenue" pour le rapport final.
- **Priorité :** **NICE-TO-HAVE** — Utile pour comparer deux approches d'audit, mais la fonction Edit Message (3.2) couvre 80% du besoin d'itération.

### 3.7. Feedback Thumbs (Up / Down)
- **Comportement exact :** Deux icônes pouce haut / pouce bas sous chaque message assistant. Click → ouverture d'un petit modal ou inline form pour commentaire optionnel. Soumission envoyée au backend pour fine-tuning / logs.
- **Déclencheurs :** Click sur 👍 / 👎. Disparition des icônes après vote (remplacement par texte "Merci pour votre retour").
- **Bonnes pratiques UX :** Garder le formulaire de feedback minimal (1 champ texte optionnel, max 500 caractères). Ne pas être intrusif. En B2B, le feedback doit être rattaché au contexte complet (thread ID, model version, prompt ID) pour analyses qualité.
- **Priorité :** **MUST-HAVE** — Boucle de feedback indispensable pour améliorer les personas d'audit et détecter les hallucinations.

### 3.8. Read Aloud / TTS
- **Comportement exact :** Bouton "Lire" (icône haut-parleur ou play) sur le message assistant. Déclenche la synthèse vocale du texte. Indication de progression (mots surlignés au fur et à mesure). Bouton pause/stop.
- **Déclencheurs :** Click sur l'icône TTS. Sélection de texte spécifique + "Lire la sélection".
- **Bonnes pratiques UX :** Utiliser l'API Web Speech ou un backend TTS. Permettre le réglage de vitesse (0.5x - 2x). En B2B sécurité, peu utilisé pour du code, mais peut être utile pour la relecture de conclusions de rapport.
- **Priorité :** **NICE-TO-HAVE** — Accessibilité secondaire.

### 3.9. Message Timestamps
- **Comportement exact :** Affichage de l'heure exacte d'envoi/réception (ex: "14:32" ou "2 min ago") sur chaque bulle, généralement en gris clair et petite taille, au survol ou permanent.
- **Déclencheurs :** Survol de la bulle (affichage subtil) ou affichage permanent.
- **Bonnes pratiques UX :** Format relatif pour les récents ("il y a 2 min"), absolu au tooltip ("13 mai 2026, 14:32 UTC"). En B2B sécurité, les timestamps doivent être précis au second près et en UTC pour la traçabilité des audits.
- **Priorité :** **MUST-HAVE** — Traçabilité temporelle des interactions, essentielle pour les rapports et les logs.

### 3.10. Avatar / Agent Badges
- **Comportement exact :** Avatar (icône ou initiales) affiché à côté de chaque message. Pour l'assistant, afficher le logo/nom du modèle ou de la persona (ex: "BJHUNT AUDIT", "Scanner", "Analyste"). Pour l'utilisateur, sa photo de profil ou ses initiales.
- **Déclencheurs :** Constant.
- **Bonnes pratiques UX :** L'avatar assistant doit refléter la "persona" active (si multi-personas). Utiliser un tooltip sur l'avatar indiquant le modèle exact et la version. En B2B, cela renforce la confiance : l'utilisateur sait qui/quoi lui parle.
- **Priorité :** **MUST-HAVE** — Indispensable dès qu'il y a multi-personas ou changement de modèle.

### 3.11. File Attachments Preview (in Messages)
- **Comportement exact :** Les fichiers uploadés par l'utilisateur apparaissent comme des "chips" ou vignettes au-dessus ou en dessous du message texte. Pour les images, afficher un thumbnail cliquable (lightbox). Pour les documents, une icône de fichier avec nom et extension.
- **Déclencheurs :** Envoi du message contenant des fichiers.
- **Bonnes pratiques UX :** Click sur un fichier = téléchargement ou prévisualisation inline (pour images, PDF). Pour les fichiers texte/code, permettre un aperçu brut inline (collapsible). Indiquer la taille du fichier.
- **Priorité :** **MUST-HAVE** — L'audit pentest repose sur l'analyse de fichiers attachés ; leur visualisation dans le thread est obligatoire.

### 3.12. Image Gallery (in Conversation)
- **Comportement exact :** Si plusieurs images sont uploadées ou générées, elles s'affichent sous forme de grille responsive (1 colonne mobile, 2-3 desktop). Click pour lightbox/zoom.
- **Déclencheurs :** Upload ou génération d'images multiples.
- **Bonnes pratiques UX :** Lazy loading des thumbnails. Lightbox avec navigation `← →` et zoom. Légende optionnelle. En B2B sécurité, utile pour les screenshots de vulnérabilités ou les diagrammes d'architecture.
- **Priorité :** **NICE-TO-HAVE** — Si le produit supporte la vision (analyse de screenshots), la galerie devient MUST-HAVE.

---

## 4. NAVIGATION / THREAD

### 4.1. Thread List Sidebar
- **Comportement exact :** Barre latérale (gauche) affichant l'historique des conversations sous forme de liste. Chaque item montre un titre (généré automatiquement ou édité par l'utilisateur), la date, et un aperçu des premiers mots du premier message. Possibilité de créer un "New Chat".
- **Déclencheurs :** Constant. Sur mobile, slide-in depuis la gauche via hamburger menu.
- **Bonnes pratiques UX :** Trier par date décroissante. Grouper par date relative ("Aujourd'hui", "Hier", "Cette semaine"). Survol d'un item → apparition d'icônes d'action (Rename, Delete, Archive). Search bar en haut de la sidebar pour filtrer les threads. En B2B, prévoir une icône "Épinglé" pour les audits en cours.
- **Priorité :** **MUST-HAVE** — Un consultant sécurité gère plusieurs audits en parallèle ; la navigation rapide entre les threads est vitale.

### 4.2. Thread Title Auto-generation & Edit
- **Comportement exact :** Le titre du thread est initialement généré automatiquement par l'IA à partir du premier message (ex: "Audit XSS sur app.bjhunt.com"). L'utilisateur peut le modifier en clickant dessus (inline edit).
- **Déclencheurs :** Premier message envoyé → requête silencieuse au modèle pour résumer en 4-5 mots. Click sur le titre → mode édition.
- **Bonnes pratiques UX :** Limiter à 50-60 caractères. Afficher un crayon au survol. Sauvegarde auto sur blur ou Enter. En B2B, permettre aussi un système de tags/catégories (ex: "#OWASP-A1", "#Rapport-Final") en complément du titre.
- **Priorité :** **MUST-HAVE** — Sans titre clair, la sidebar devient inutilisable au-delà de 10 threads.

### 4.3. Search in Thread (Ctrl+K / Cmd+K)
- **Comportement exact :** Barre de recherche globale (command palette style ou champ dédié) permettant de chercher du texte dans l'ensemble de l'historique de conversation actuel (ou global). Résultats affichés avec le contexte (snippet) et la possibilité de sauter au message concerné.
- **Déclencheurs :** Raccourci `Ctrl+K` ou `Ctrl+Shift+F`. Click sur l'icône loupe.
- **Bonnes pratiques UX :** Recherche full-text avec highlight des termes. Filtrer par rôle (User / Assistant). En B2B sécurité, un audit peut contenir des centaines de messages ; retrouver une commande ou une réponse spécifique est indispensable.
- **Priorité :** **MUST-HAVE** — Recherche dans les longs threads d'audit est un besoin quotidien.

### 4.4. Infinite Scroll vs Pagination
- **Comportement exact :** Chargement des messages anciens au scroll vers le haut (infinite scroll) ou via boutons "Page précédente / suivante". ChatGPT et Claude utilisent l'infinite scroll. Certains outils B2B utilisent la pagination pour des raisons de performance.
- **Déclencheurs :** Scroll vers le haut dans le thread → chargement asynchrone des 20-50 messages précédents.
- **Bonnes pratiques UX :** Infinite scroll préférable pour la fluidité, mais avec un "skeleton" de messages pendant le fetch. **Attention :** en B2B, l'infinite scroll peut casser la recherche navigateur (Ctrl+F) sur du contenu non chargé. Proposer un bouton "Charger tout l'historique" pour les exports.
- **Priorité :** **MUST-HAVE** — L'infinite scroll est le standard attendu, mais implémenter avec une taille de page cohérente (20-30 messages).

### 4.5. Scroll-to-Bottom & New Message Indicator
- **Comportement exact :** Lorsque l'utilisateur a scrollé vers le haut et qu'un nouveau message arrive (ou que la génération continue), un bouton flottant "↓ Nouveau message" ou "↓ Retour en bas" apparaît en bas à droite du viewport. Click dessus → scroll smooth jusqu'au dernier message.
- **Déclencheurs :** `scrollTop > threshold` ET `newMessageArrived === true`.
- **Bonnes pratiques UX :** Badge de compteur indiquant le nombre de nouveaux messages non lus. Disparaît automatiquement si l'utilisateur scroll manuellement jusqu'en bas. Pour le streaming, ne pas forcer le scroll automatique si l'utilisateur est en train de lire en haut (éviter le "scroll hijacking" agressif).
- **Priorité :** **MUST-HAVE** — Empêche de perdre le fil pendant les longues générations.

### 4.6. Unread Badge
- **Comportement exact :** Dans la sidebar, les threads contenant des messages non lus (ex: suite d'une conversation générée en asynchrone ou par un collaborateur) affichent un point ou un chiffre.
- **Déclencheurs :** Nouveau message reçu alors que le thread n'est pas actif.
- **Bonnes pratiques UX :** Badge discret (cercle bleu ou chiffre). S'effacer dès l'ouverture du thread. En B2B, support crucial pour la collaboration multi-utilisateur sur un même audit.
- **Priorité :** **NICE-TO-HAVE** — Indispensable uniquement en mode collaboratif (multi-user sur même thread).

### 4.7. Fork / Branch Conversations
- **Comportement exact :** Permettre de "dupliquer" un thread à partir d'un message spécifique pour explorer une autre piste d'audit sans perdre l'original. Le nouveau thread référence le thread parent.
- **Déclencheurs :** Menu contextuel sur un message → "Fork à partir d'ici".
- **Bonnes pratiques UX :** Afficher une indication visuelle dans le nouveau thread : "Forké depuis [Nom du thread original]". Permettre de "merger" ou comparer les deux branches.
- **Priorité :** **NICE-TO-HAVE** — Très utile pour les scénarios "what-if" en audit, mais peut être pallié par la création manuelle d'un nouveau thread.

---

## 5. CONTEXT / MEMORY

### 5.1. Context Window Indicator
- **Comportement exact :** Indicateur visuel (souvent dans le header ou la sidebar) montrant combien de tokens / pourcentage de la fenêtre de contexte est utilisé. Peut être une barre fine ou un texte "12k / 128k tokens".
- **Déclencheurs :** Mise à jour après chaque message (côté client estimation ou côté serveur retour réel).
- **Bonnes pratiques UX :** Barre de progression colorée : vert < 50%, orange < 80%, rouge > 90%. Tooltip au survol expliquant que le dépassement peut entraîner une perte de contexte. En B2B sécurité, prévenir l'utilisateur avant qu'un long rapport ne soit tronqué.
- **Priorité :** **NICE-TO-HAVE** — Utile pour les power users, mais en pratique, les modèles 2025 (GPT-5.5, Claude 4) ont des context windows si larges (500k+) que l'indicateur est rarement critique. À envisager si le produit utilise des modèles à contexte réduit.

### 5.2. Memory Chips / Custom Context Injection
- **Comportement exact :** Petits chips ou badges affichés en haut du thread ou dans un panneau latéral droit, représentant des "souvenirs" ou instructions personnalisées injectées dans le contexte (ex: "Stack: Next.js 16", "Scope: API publique uniquement", "Langue: Français").
- **Déclencheurs :** Configuration utilisateur ou extraction automatique au fil de la conversation.
- **Bonnes pratiques UX :** Les chips doivent être editables (click → edit), supprimables (croix), et ajoutables via un bouton "+". Utiliser des couleurs distinctes par catégorie. En B2B sécurité, cela standardise le contexte de l'audit.
- **Priorité :** **MUST-HAVE** — Pour un produit d'audit sécurité, injecter le contexte du scope (cible, stack, contraintes) est fondamental pour la qualité des réponses.

### 5.3. Custom Instructions Toggle
- **Comportement exact :** Un panneau accessible depuis les paramètres ou un bouton dédié permettant à l'utilisateur de définir des instructions système globales (ex: "Tu es un expert en pentest OWASP. Tu rédiges toujours en français."). Un toggle permet d'activer/désactiver ces instructions pour un thread spécifique.
- **Déclencheurs :** Settings → Custom Instructions. Toggle dans le header du thread.
- **Bonnes pratiques UX :** Zone de texte dédiée (2 champs : "Ce que vous souhaitez que l'assistant sache" / "Comment vous souhaitez qu'il réponde"). Prévisualisation de l'impact. En B2B, ces instructions peuvent être prédéfinies par l'admin (templates de persona).
- **Priorité :** **MUST-HAVE** — Les personas B2B (38 dans bjhunt-engine selon AGENTS.md) reposent sur ces instructions. L'UI doit permettre de les activer/sélectionner.

### 5.4. System Prompt Editor (Admin)
- **Comportement exact :** Interface réservée aux administrateurs/éditeurs de persona permettant de modifier le "developer message" ou "system prompt" avec preview du rendu. Versioning des prompts.
- **Déclencheurs :** Panel admin accessible via rôle spécifique.
- **Bonnes pratiques UX :** Split-screen : éditeur markdown à gauche, preview de conversation à droite (mode "playground"). Tests A/B intégrés. En B2B sécurité, seuls les leads technique doivent pouvoir éditer les prompts des agents d'audit.
- **Priorité :** **MUST-HAVE** — C'est l'interface de configuration des 38 personas mentionnés dans l'architecture BJHUNT.

---

## 6. TOOLS / ACTIONS

### 6.1. Web Search Toggle
- **Comportement exact :** Bouton toggle (souvent dans le composer ou en header) activant la capacité de l'agent à rechercher sur le web. Lorsque actif, les résultats de recherche apparaissent comme des citations numérotées `[1]`, `[2]` dans la réponse, avec une sidebar ou un popup listant les sources.
- **Déclencheurs :** Toggle on/off. Auto-détection par le modèle selon la requête (ex: "Quelles sont les dernières CVE ?").
- **Bonnes pratiques UX :** Lorsque activé, afficher un indicateur "Recherche web activée" dans la bulle. Les sources doivent être cliquables et afficher l'URL, le titre, et un snippet. En B2B sécurité, vérifier que les sources sont fiables (CVE officielles, NIST, etc.).
- **Priorité :** **MUST-HAVE** — Un audit nécessite des informations à jour (CVE récentes, nouvelles failles). La transparence des sources est critique.

### 6.2. Code Interpreter / Sandbox Mode
- **Comportement exact :** L'agent peut écrire et exécuter du code (Python, Bash, etc.) dans un environnement isolé (sandbox E2B/Docker/mock). L'UI montre le code généré, puis le résultat de l'exécution (stdout, stderr, graphiques). Possibilité pour l'utilisateur de modifier le code et relancer.
- **Déclencheurs :** Demande explicite de calcul/analyse. Auto-détection par le modèle.
- **Bonnes pratiques UX :** Afficher clairement le statut de la sandbox ("En cours d'exécution...", "Terminé", "Erreur"). Timeout visuel si l'exécution dépasse X secondes. Permettre l'édition du code par l'utilisateur avant ré-exécution. En B2B sécurité, le mode sandbox est le cœur du produit (cf. AGENTS.md : sandbox E2B).
- **Priorité :** **MUST-HAVE** — L'audit pentest repose sur l'exécution d'outils dans un sandbox sécurisé (cf. architecture BJHUNT).

### 6.3. Canvas Mode (Document Editor)
- **Comportement exact :** (ChatGPT Canvas, Claude Artifacts) Mode d'édition collaborative côte à côte : à gauche le chat, à droite un éditeur de document/code où l'assistant et l'utilisateur peuvent co-éditer un fichier long. Support du versioning (avant/après).
- **Déclencheurs :** Détection automatique d'un contenu "éditable long" (code, rapport markdown) ou bouton "Ouvrir dans Canvas".
- **Bonnes pratiques UX :** Split-screen responsive. Boutons d'action contextuels dans le canvas ("Ajouter des commentaires", "Corriger", "Traduire"). Slider "Avant / Après". En B2B sécurité, idéal pour la rédaction collaborative de rapports d'audit.
- **Priorité :** **CUTTING-EDGE** — Très demandé en 2025-2026, mais complexe à implémenter. Peut être différé derrière les fonctions core.

### 6.4. File Generation (CSV, PDF, JSON)
- **Comportement exact :** L'assistant génère un fichier structuré (ex: tableau de vulnérabilités en CSV, rapport PDF, configuration JSON). L'UI affiche une vignette de fichier généré avec un bouton "Télécharger".
- **Déclencheurs :** Demande explicite ou auto-génération à la fin d'un audit.
- **Bonnes pratiques UX :** Prévisualisation du contenu inline (aperçu des 10 premières lignes d'un CSV, rendu d'un PDF page 1). Nom de fichier suggéré par l'IA mais éditable. En B2B sécurité, générer des rapports PDF/A ou CSV structurés est un livrable classique.
- **Priorité :** **MUST-HAVE** — La livraison de rapports structurés est un besoin business fondamental.

### 6.5. Image Generation Toggle
- **Comportement exact :** Toggle ou bouton permettant de générer des images (diagrammes d'architecture, schémas d'attaque) via un modèle de génération d'image intégré.
- **Déclencheurs :** Bouton dédié ou commande `/image`.
- **Bonnes pratiques UX :** Afficher un indicateur de génération (spinner). Prévisualisation immédiate. Option "Régénérer" avec variation.
- **Priorité :** **NICE-TO-HAVE** — Utile pour les rapports (diagrammes de flux d'attaque), mais non critique pour l'analyse technique.

### 6.6. Plugin / App Store / MCP Connectors
- **Comportement exact :** Interface permettant d'activer des extensions (MCP servers, plugins) pour étendre les capacités de l'agent (ex: connexion à Jira, GitHub, scanners externes). Affichage d'un "store" avec permissions.
- **Déclencheurs :** Settings → Plugins / Connecteurs. ChatGPT utilise les MCP Apps via Apps SDK.
- **Bonnes pratiques UX :** Liste des connectors avec permissions granulaires. Indicateur "Activé" en vert. Modal de consentement avant connexion à un service tiers. En B2B sécurité, **extrêmement sensible** : chaque connector doit être whitelisting par l'admin et auditable.
- **Priorité :** **CUTTING-EDGE** — Puissant pour l'intégration supply-chain, mais la sécurité des permissions est un chantier à part entière (cf. scope-guard.cjs dans BJHUNT).

---

## 7. ACCESSIBILITY

### 7.1. Keyboard Shortcuts
- **Comportement exact :** Ensemble de raccourcis clavier pour toutes les actions principales : `Ctrl+Enter` (envoi), `Shift+Esc` (stop), `Ctrl+K` (recherche), `Ctrl+N` (nouveau chat), `Ctrl+↑/↓` (naviguer dans l'historique du composer), `Ctrl+C` sur un bloc (copie).
- **Déclencheurs :** Keydown events globaux ou contextuels.
- **Bonnes pratiques UX :** Afficher les raccourcis dans les tooltips des boutons. Page d'aide accessible via `?` listant tous les shortcuts. Pas de conflit avec les raccourcis OS/navigateur.
- **Priorité :** **MUST-HAVE** — Les utilisateurs B2B (développeurs, pentesters) sont ultra-dépendants au clavier.

### 7.2. Screen Reader Announcements (ARIA Live)
- **Comportement exact :** Utilisation de régions ARIA live (`aria-live="polite"`) pour annoncer aux lecteurs d'écran : l'arrivée d'un nouveau message, le changement de statut ("En train d'écrire..."), la fin de génération, les erreurs.
- **Déclencheurs :** Changement d'état du stream. Ajout d'un nouveau message dans le DOM.
- **Bonnes pratiques UX :** `aria-live="polite"` pour ne pas interrompre la lecture en cours. `aria-live="assertive"` uniquement pour les erreurs critiques. Structurer le DOM pour que chaque bulle soit une région distincte avec un `role="article"` et un `aria-label` indiquant l'auteur et l'heure.
- **Priorité :** **MUST-HAVE** — Compliance légale (WCAG 2.1 AA) et inclusion obligatoires pour un produit B2B.

### 7.3. Focus Management
- **Comportement exact :** Le focus clavier est toujours positionné logiquement : après envoi, le focus reste dans le thread (ou revient au composer selon le choix UX). Après une action (edit, delete), le focus est restauré sur l'élément suivant logique. Trap focus dans les modals.
- **Déclencheurs :** Actions utilisateur (envoi, ouverture modal, fermeture).
- **Bonnes pratiques UX :** Outline de focus visible et contrastée (ne pas supprimer le `outline` sans remplacement). `tabIndex` logique. Indicateur visuel clair de l'élément focusé.
- **Priorité :** **MUST-HAVE** — WCAG 2.1 AA requis.

### 7.4. Reduced Motion Support
- **Comportement exact :** Respect de la préférence utilisateur `prefers-reduced-motion`. Si activé, supprimer les animations de shimmer, les transitions de scroll fluides, les effets de pulse, et limiter les morphing d'icônes.
- **Déclencheurs :** Détection média CSS `prefers-reduced-motion: reduce`.
- **Bonnes pratiques UX :** Remplacer les animations par des transitions instantanées ou des changements d'opacité très rapides. Le caret de streaming peut rester mais sans blink (statique).
- **Priorité :** **MUST-HAVE** — Accessibilité et respect des préférences utilisateur.

### 7.5. High Contrast / Color Contrast
- **Comportement exact :** Tous les textes, badges, et éléments interactifs respectent un ratio de contraste minimum 4.5:1 (AA) ou 7:1 (AAA). Support du mode "High Contrast" OS.
- **Déclencheurs :** Constant. CSS `forced-colors: active` pour le support mode contrasté Windows.
- **Bonnes pratiques UX :** Ne pas utiliser la couleur comme seul indicateur sémantique (ajouter des icônes ou labels textuels). Tester avec des simulateurs daltonisme.
- **Priorité :** **MUST-HAVE** — Compliance et lisibilité professionnelle.

---

## 8. MOBILE / RESPONSIVE

### 8.1. Mobile Composer (Bottom Fixed)
- **Comportement exact :** Sur mobile, le composer reste fixé en bas de l'écran (au-dessus du clavier virtuel). L'input est réduit à une ligne avec boutons latéraux (attach, send). Le clavier push le viewport sans cacher le thread.
- **Déclencheurs :** Focus du textarea → apparition du clavier. `visualViewport` API pour ajuster la hauteur.
- **Bonnes pratiques UX :** Gérer le `safe-area-inset-bottom` sur iOS. Empêcher le "page jump" quand le clavier apparaît. Garder un padding-bottom dynamique.
- **Priorité :** **MUST-HAVE** — Le produit doit être utilisable sur mobile pour les consultants sur le terrain.

### 8.2. Swipe Gestures
- **Comportement exact :** Swipe droite sur un message pour "Répondre" (quote). Swipe gauche pour "Supprimer" ou "Copier". Swipe depuis le bord gauche de l'écran pour ouvrir la sidebar des threads.
- **Déclencheurs :** Touch events `touchstart`, `touchmove`, `touchend` avec calcul de delta X.
- **Bonnes pratiques UX :** Fournir un feedback haptique (vibration courte) et visuel (l'item se décale légèrement, fond coloré apparaît). Ne pas interferer avec le scroll vertical. En B2B, le swipe-delete doit avoir une confirmation.
- **Priorité :** **NICE-TO-HAVE** — Confort mobile, mais les menus contextuels suffisent.

### 8.3. Bottom Sheet (File Preview, Tool Results)
- **Comportement exact :** Sur mobile, les résultats d'outils, les previews de fichiers, ou les détails de citations s'ouvrent dans une bottom sheet (panneau glissable depuis le bas) plutôt qu'une modal centrée.
- **Déclencheurs :** Click sur un fichier attaché ou une citation.
- **Bonnes pratiques UX :** Hauteur initiale à 50% de l'écran, expandable à 90% par drag. Fermeture par swipe down ou backdrop click. Scroll interne.
- **Priorité :** **NICE-TO-HAVE** — Adaptation mobile standard.

### 8.4. Floating Action Button (FAB)
- **Comportement exact :** Bouton flottant circulaire en bas à droite pour l'action principale ("Nouveau Chat" ou "Voice Input").
- **Déclencheurs :** Constant sur les vues liste. Disparaît lors de la saisie.
- **Bonnes pratiques UX :** Ne pas masquer le contenu essentiel. Utiliser une ombre portée subtile. En B2B, préférer une barre d'action fixe en bas plutôt qu'un FAB qui masque du contenu.
- **Priorité :** **NICE-TO-HAVE** — Non critique.

### 8.5. Haptic Feedback
- **Comportement exact :** Retours haptiques (vibrations courtes) lors de l'envoi d'un message, la réception d'une réponse, la copie d'un code, ou l'activation d'un toggle.
- **Déclencheurs :** Actions tactiles sur mobile.
- **Bonnes pratiques UX :** Vibrations très courtes (10-20ms). Ne pas surutiliser. Respecter le paramètre système "Réduire le mouvement / Haptics".
- **Priorité :** **NICE-TO-HAVE** — Polish.

---

## 9. POLISH / MICRO-INTERACTIONS

### 9.1. Entry Animations (Message Appearance)
- **Comportement exact :** Lorsqu'un nouveau message apparaît, il subit une courte animation : fade-in + slide-up (Y: 10px → 0) sur 150-250ms. L'animation est déclenchée uniquement pour les nouveaux messages, pas au chargement initial de l'historique.
- **Déclencheurs :** Insertion d'un nouveau message dans le DOM.
- **Bonnes pratiques UX :** Utiliser `transform` et `opacity` (composited animations). Durée : 200ms max. Easing : `cubic-bezier(0.25, 0.1, 0.25, 1.0)` (ease-out). Ne pas animer les messages déjà présents lors du scroll infini.
- **Priorité :** **NICE-TO-HAVE** — Donne de la fluidité sans impacter la fonctionnalité.

### 9.2. Exit Animations (Delete / Collapse)
- **Comportement exact :** Lors de la suppression d'un message, celui-ci s'efface avec un shrink (scale 1 → 0.95 + opacity 1 → 0 + height collapse) sur 200ms avant d'être retiré du DOM.
- **Déclencheurs :** Action de suppression confirmée.
- **Bonnes pratiques UX :** Animer la hauteur avec `grid-template-rows` ou `max-height` pour éviter les sauts soudains. Si undo possible, laisser le message en place avec un overlay "Supprimé — Annuler" pendant 5s.
- **Priorité :** **NICE-TO-HAVE** — Confort visuel.

### 9.3. Hover States
- **Comportement exact :** Tous les éléments interactifs (boutons, messages, chips) ont un état hover clair : changement de fond (opacité +5-10%), curseur pointer, tooltip explicatif après 500ms.
- **Déclencheurs :** `mouseenter`.
- **Bonnes pratiques UX :** Les messages assistant révèlent leurs actions (copy, thumbs) uniquement au hover (desktop) ou dans un menu (mobile). Le feedback doit être immédiat (`transition: 100ms`).
- **Priorité :** **MUST-HAVE** — Découvrabilité des actions est essentielle.

### 9.4. Loading Spinners & Progress Indicators
- **Comportement exact :** Plusieurs types : (a) Spinner circulaire CSS sur les boutons d'action asynchrones, (b) Barre de progression linéaire en haut de page pour le chargement initial, (c) Skeletons pour les zones de contenu (cf. 2.3).
- **Déclencheurs :** Fetch asynchrone, upload fichier, attente de première réponse token.
- **Bonnes pratiques UX :** Ne jamais bloquer l'UI entière avec un spinner plein écran. Utiliser des loaders locaux. Pour les uploads, montrer le % précis. Pour le streaming, le caret est le loader.
- **Priorité :** **MUST-HAVE** — Indicateurs de système réactif ; absence = impression de bug.

### 9.5. Error States & Retry Flows
- **Comportement exact :** Si une requête échoue (erreur réseau, rate limit, erreur serveur), le message utilisateur reste en place. Un bandeau d'erreur rouge/orange apparaît sous le message ou dans la bulle assistant tronquée, avec un bouton "Réessayer". Le retry renvoie exactement la même requête.
- **Déclencheurs :** `catch` sur le fetch/stream. Déconnexion réseau détectée.
- **Bonnes pratiques UX :** Messages d'erreur explicites : "Erreur réseau — Vérifiez votre connexion", "Le modèle est temporairement indisponible — Réessayez dans 30s". Permettre le retry individuel (par message) et le "Regenerate" global. Conserver l'état du composer (input non perdu). En B2B sécurité, logger toutes les erreurs côté telemetry.
- **Priorité :** **MUST-HAVE** — La fiabilité est un pilier de la confiance B2B. Un chat qui "plante" sans explication est inutilisable en production.

### 9.6. Transition Timings & Easing Curves
- **Comportement exact :** Standardisation des courbes d'animation : (a) **Entrées** : `ease-out` (rapide puis lent), 200ms. (b) **Sorties** : `ease-in` (lent puis rapide), 150ms. (c) **Interactions** (hover, click) : `ease-in-out`, 100ms. (d) **Grands mouvements** (sidebar, bottom sheet) : spring physique ou `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-style), 300-400ms.
- **Déclencheurs :** Globales, via design system.
- **Bonnes pratiques UX :** Ne pas dépasser 300ms pour toute animation fonctionnelle. Utiliser `transform` et `opacity` uniquement. Respecter `prefers-reduced-motion`.
- **Priorité :** **NICE-TO-HAVE** — Fait partie du polish global.

---

## 10. SETTINGS / PREFERENCES

### 10.1. Theme Toggle (Light / Dark / System)
- **Comportement exact :** Interrupteur ou dropdown permettant de choisir entre thème clair, sombre, ou suivi du système. Appliqué instantanément sans rechargement.
- **Déclencheurs :** Settings panel ou toggle rapide en header.
- **Bonnes pratiques UX :** Persistance dans `localStorage` + synchronisation avec `prefers-color-scheme`. Tester tous les composants en dark mode (syntax highlighting, erreurs rouges qui deviennent trop agressives). En B2B, le dark mode est souvent préféré par les équipes techniques (Dev/SecOps).
- **Priorité :** **MUST-HAVE** — Standard de l'industrie, particulièrement attendu par les utilisateurs techniques.

### 10.2. Font Size / Zoom
- **Comportement exact :** Slider ou boutons A-/A+ pour ajuster la taille de police de base du thread (ex: 14px → 18px). Peut être couplé au zoom navigateur.
- **Déclencheurs :** Settings → Accessibilité.
- **Bonnes pratiques UX :** Utiliser des unités relatives (`rem`). L'ajustement doit concerner uniquement le contenu du thread, pas l'UI chrome (sidebar, header).
- **Priorité :** **NICE-TO-HAVE** — Le zoom navigateur suffit généralement.

### 10.3. Language / Locale
- **Comportement exact :** Sélection de la langue d'interface (FR, EN, etc.). Indépendante de la langue de l'assistant (contrôlée par le prompt).
- **Déclencheurs :** Settings.
- **Bonnes pratiques UX :** Détection initiale via `navigator.language`. Traduction complète de l'UI (boutons, tooltips, erreurs).
- **Priorité :** **MUST-HAVE** — Pour un produit B2B français (BJHUNT), l'interface en français est obligatoire, même si l'audit peut être multilingue.

### 10.4. Model Preferences (Default Model)
- **Comportement exact :** Sélection du modèle par défaut pour les nouveaux threads. Option "Modèle recommandé" laissée à l'admin.
- **Déclencheurs :** Settings.
- **Bonnes pratiques UX :** Afficher la description de chaque modèle (latence vs qualité). En B2B, verrouiller certains modèles pour certains rôles utilisateur.
- **Priorité :** **MUST-HAVE** — Traçabilité et cohérence des réponses d'audit.

### 10.5. Export Chat
- **Comportement exact :** Bouton permettant d'exporter un thread complet dans différents formats : Markdown (.md), PDF, JSON (structured data avec rôles et timestamps), ou CSV (pour les tableaux).
- **Déclencheurs :** Menu "..." du thread ou Settings.
- **Bonnes pratiques UX :** Inclure les métadonnées dans l'export (modèle utilisé, date, persona, contexte). Pour le PDF, utiliser un rendu propre (Typst ou HTML→PDF) avec pagination. En B2B sécurité, l'export PDF est un **livré client** standard.
- **Priorité :** **MUST-HAVE** — Non négociable pour la livraison de rapports d'audit et l'archivage compliance.

### 10.6. Delete History / Data Controls
- **Comportement exact :** Panneau permettant de supprimer tout l'historique de conversation, de désactiver la participation aux améliorations de modèle, et de gérer la rétention des données.
- **Déclencheurs :** Settings → Data & Privacy.
- **Bonnes pratiques UX :** Confirmation forte pour la suppression globale (modal avec saisie de texte "CONFIRMER"). Indication claire de la politique de rétention ("30 jours"). En B2B, distinguer "Supprimer de ma vue" (soft delete) et "Suppression définitive" (admin only, avec audit log).
- **Priorité :** **MUST-HAVE** — RGPD, confidentialité des données clients, et gouvernance des données sensibles d'audit.

---

## Tableau récapitulatif par priorité

### MUST-HAVE (Implémentation immédiate)

| # | Catégorie | Fonctionnalité |
|---|---|---|
| 1 | Streaming | Streaming Text with Caret Blink |
| 2 | Streaming | Status Pills (Phases) |
| 3 | Streaming | Partial Content Rendering (Markdown Live) |
| 4 | Streaming | Code Block Streaming |
| 5 | Streaming | Tool Call UI |
| 6 | Streaming | Stop / Cancel Generation |
| 7 | Composer | Send Button States + Stop Morphing |
| 8 | Composer | File Upload Drag & Drop |
| 9 | Composer | Multi-line Auto-resize Input |
| 10 | Messages | User vs Assistant Styling |
| 11 | Messages | Edit Message |
| 12 | Messages | Delete Message (soft delete) |
| 13 | Messages | Copy Code |
| 14 | Messages | Copy Message |
| 15 | Messages | Feedback Thumbs |
| 16 | Messages | Message Timestamps (UTC, précis) |
| 17 | Messages | Avatar / Agent Badges |
| 18 | Messages | File Attachments Preview |
| 19 | Navigation | Thread List Sidebar |
| 20 | Navigation | Thread Title Auto-generation & Edit |
| 21 | Navigation | Search in Thread (Ctrl+K) |
| 22 | Navigation | Infinite Scroll |
| 23 | Navigation | Scroll-to-Bottom / New Message Indicator |
| 24 | Context | Memory Chips / Custom Context |
| 25 | Context | Custom Instructions Toggle |
| 26 | Context | System Prompt Editor (Admin) |
| 27 | Tools | Web Search Toggle + Citations |
| 28 | Tools | Code Interpreter / Sandbox Mode |
| 29 | Tools | File Generation (CSV, PDF) |
| 30 | Accessibility | Keyboard Shortcuts |
| 31 | Accessibility | Screen Reader Announcements (ARIA Live) |
| 32 | Accessibility | Focus Management |
| 33 | Accessibility | Reduced Motion Support |
| 34 | Accessibility | High Contrast / Color Contrast |
| 35 | Mobile | Mobile Composer (Bottom Fixed) |
| 36 | Polish | Error States & Retry Flows |
| 37 | Polish | Loading Spinners (locaux) |
| 38 | Settings | Theme Toggle (Light/Dark/System) |
| 39 | Settings | Language / Locale |
| 40 | Settings | Model Preferences |
| 41 | Settings | Export Chat (MD, PDF, JSON) |
| 42 | Settings | Delete History / Data Controls |

### NICE-TO-HAVE (Phase 2)

| # | Catégorie | Fonctionnalité |
|---|---|---|
| 43 | Composer | Image Paste & Clipboard Upload |
| 44 | Composer | Slash Commands |
| 45 | Composer | Voice Input / Dictation |
| 46 | Composer | Expand / Collapse Composer |
| 47 | Composer | Formatting Toolbar |
| 48 | Messages | Read Aloud / TTS |
| 49 | Messages | Image Gallery |
| 50 | Messages | Regenerate / Branch |
| 51 | Navigation | Unread Badge |
| 52 | Navigation | Fork Conversation |
| 53 | Context | Context Window Indicator |
| 54 | Tools | Image Generation Toggle |
| 55 | Mobile | Swipe Gestures |
| 56 | Mobile | Bottom Sheet |
| 57 | Mobile | Floating Action Button |
| 58 | Mobile | Haptic Feedback |
| 59 | Polish | Entry Animations |
| 60 | Polish | Exit Animations |
| 61 | Polish | Hover States |
| 62 | Polish | Skeleton Loaders |
| 63 | Settings | Font Size / Zoom |

### CUTTING-EDGE (Évaluation post-MVP)

| # | Catégorie | Fonctionnalité |
|---|---|---|
| 64 | Composer | @Mentions (Agents/Users) |
| 65 | Composer | Emoji Picker *(exclu recommandé)* |
| 66 | Streaming | Reasoning / Thinking UI (détaillé) |
| 67 | Streaming | Skeleton Loader avancé |
| 68 | Tools | Canvas Mode (Document Editor) |
| 69 | Tools | Plugin / App Store / MCP Connectors |
| 70 | Polish | Transition Timings & Easing (Design System complet) |

---

## Notes spécifiques B2B Sécurité (BJHUNT)

1. **Traçabilité avant tout :** Chaque message doit embarquer métadonnées invisibles (model version, timestamp UTC, persona ID, hash du contexte) pour permettre la reconstitution exacte d'un rapport d'audit.
2. **Sandbox Visibility :** L'UI de tool call doit être la vitrine principale du produit. Chaque exécution de code doit être affichée comme une "preuve" avec statut, stdout/stderr, et durée d'exécution.
3. **Export PDF :** L'export doit utiliser les templates Typst (cf. `bjhunt-engine`) pour garantir l'identité visuelle et la cohérence des rapports clients.
4. **Scope Guard :** L'interface doit refléter l'état `scope.in_scope` (mandat signé). Si le scope n'est pas défini, griser certaines actions agressives et afficher un bandeau "Mandat requis".
5. **No Distraction :** Éviter les micro-interactions trop ludiques (emojis, sonneries, animations flashy). Privilégier une esthétique "terminal/sérieux" qui renforce la crédibilité technique.
6. **SSE Events :** Implémenter les 12+ events typés du streaming (cf. `STREAMING_EVENTS.md` dans `bjhunt-engine`) avec des transitions UI explicites pour chaque phase.

---

*Fin du document de recherche.*
