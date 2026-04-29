# BJHUNT V2.1 — Cloudflare Tunnel devant Coolify

Coolify écoute en clair sur `82.25.117.79:8000` (HTTP, port public). Docker
bypass UFW donc on ne peut pas filtrer par firewall sans casser le runtime.
Solution propre : un **Cloudflare Tunnel** qui relie le VPS à Cloudflare via
une connexion sortante chiffrée (cloudflared), expose Coolify en
`https://coolify.bjhunt.com` derrière le WAF + Access policies, et permet
de couper le port 8000 de l'extérieur.

## Mise en place

### Étape interactive (30s côté browser)

1. Cloudflare Dashboard → Zero Trust → Networks → Tunnels → **Create Tunnel**
2. Type `Cloudflared`, name `bjhunt-coolify`
3. Copier le **install token** (long string `eyJhI...`)
4. Public Hostnames → Add :
   - Subdomain `coolify`, Domain `bjhunt.com`
   - Service `http://localhost:8000`
5. Recommandé — Access → Applications → Self-hosted :
   - Application domain `coolify.bjhunt.com`
   - Policy : email match `@bjhunt.com` (ou MFA org)

### Étape automatisée (sur le VPS)

```bash
ssh bjhunt-vps "BJHUNT_CF_TUNNEL_TOKEN='<le-token>' bash /root/setup-cloudflared-coolify.sh"
```

Le script :
- ajoute le repo apt `pkg.cloudflare.com`
- installe `cloudflared`
- désinstalle toute instance précédente
- enregistre le service systemd avec le token (`cloudflared service install`)
- enable + start

### Étape post-déploiement

Une fois `coolify.bjhunt.com` répond, on **ferme le port 8000** :

```bash
ssh bjhunt-vps "iptables -I INPUT 1 -p tcp --dport 8000 ! -i lo -j DROP"
# ou via Hostinger panel firewall si on en utilise un
```

(Coolify continue d'écouter sur 8000 en local, mais l'accès Internet passe
exclusivement par le tunnel.)

## Sécurité

- **TLS** : terminé par Cloudflare (cert managed, HSTS preload).
- **WAF** : règles Cloudflare WAF, Managed + custom.
- **Access** : OAuth/SAML/email-OTP devant Coolify — un attaquant doit
  passer Cloudflare *avant* d'atteindre la page de login.
- **Visibilité** : logs cloudflared envoyés vers Cloudflare Logs (Phase 2 :
  Logpush vers R2 pour SOC 2 audit trail).
- **Rotation token** : `cloudflared service uninstall && cloudflared service
  install <new-token>` quand le token est tourné.

## Status / debug

```bash
ssh bjhunt-vps "systemctl status cloudflared --no-pager"
ssh bjhunt-vps "journalctl -u cloudflared -n 50 --no-pager"
ssh bjhunt-vps "cloudflared tunnel info bjhunt-coolify 2>&1 | head -10"
curl -I https://coolify.bjhunt.com   # → 302 Coolify
```

## Pourquoi pas Caddy ?

Caddy aurait demandé : un domaine pointant en A vers le VPS, l'ouverture
de 443 publique avec DOCKER-USER iptables shenanigans, la gestion du cert
ACME, et la fermeture du 8000 — cinq étapes non triviales dont une où le
VPS reste exposé pendant la propagation. Cloudflare Tunnel élimine tout
ça : connexion sortante uniquement, pas de port à ouvrir, certs gérés par
CF, Access policies par-dessus, et déjà aligné avec notre stack DNS+WAF
existante (la zone `bjhunt.com` est déjà sur Cloudflare).
