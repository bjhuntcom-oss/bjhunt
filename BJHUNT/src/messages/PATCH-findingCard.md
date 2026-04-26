// i18n patch — append these keys under the root object of messages/en.json and messages/fr.json.
// Chantier A delivery for FindingCard. Kept as a standalone .md so the TSX drop doesn't
// force you to resolve merge conflicts inside the big translation files.

EN (messages/en.json — under the root object):
  "components": {
    "findingCard": {
      "verified": "VERIFIED",
      "verifiedTooltip": "Confirmed exploitable by the Verifier agent",
      "cvss": "CVSS",
      "agent": "Agent",
      "viewEvidence": "View Evidence",
      "viewRecommendation": "View Recommendation"
    }
  }

FR (messages/fr.json — under the root object):
  "components": {
    "findingCard": {
      "verified": "VÉRIFIÉ",
      "verifiedTooltip": "Exploitabilité confirmée par l'agent Verifier",
      "cvss": "CVSS",
      "agent": "Agent",
      "viewEvidence": "Voir la preuve",
      "viewRecommendation": "Voir la remédiation"
    }
  }
