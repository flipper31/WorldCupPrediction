# WM 2026 AI Predictions

Webseite mit KI-generierten Spielprognosen für die WM 2026 — inkl. Begründung
warum die AI das Ergebnis so einschätzt (Torschüsse, Ballbesitz, Form etc.).

## Architektur

```
scripts/generate-predictions.mjs   (lokal / Cron)
  ├── API-Football  → Spielplan + Team-Statistiken
  ├── Claude API    → Prognose + Begründung pro Spiel
  └── schreibt frontend/public/predictions.json

frontend/ (React + Vite)
  └── statischer Build → Nginx (LXC 110, Port 8181)
```

Die API-Keys bleiben lokal — der Server bekommt nur statische Dateien.

## Entwicklung

```bash
cd frontend
npm install
npm run dev
```

## Predictions generieren

```bash
cd scripts
npm install
API_FOOTBALL_KEY=xxx ANTHROPIC_API_KEY=xxx npm run generate
```

Ohne Keys zeigt die Seite die mitgelieferten Demo-Daten (Banner wird angezeigt).

## Deployment

```bash
cd frontend && npm run build
tar -czf ../worldcup-dist.tar.gz -C dist .
scp ../worldcup-dist.tar.gz root@192.168.178.252:/tmp/
ssh root@192.168.178.252 "pct push 110 /tmp/worldcup-dist.tar.gz /tmp/worldcup-dist.tar.gz && pct exec 110 -- bash -c 'tar -xzf /tmp/worldcup-dist.tar.gz -C /var/www/worldcup'"
```

Nginx-Config liegt im Container unter `/data/nginx/custom/http.conf` (Port 8181).

Seite: http://192.168.178.135:8181
