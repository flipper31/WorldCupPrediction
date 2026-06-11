/**
 * Generiert WM 2026 Predictions:
 * 1. Holt Spiele + Team-Statistiken von API-Football
 * 2. Lässt Claude pro Spiel eine Prognose mit Begründung erstellen
 * 3. Schreibt frontend/public/predictions.json
 *
 * Benötigte Umgebungsvariablen:
 *   API_FOOTBALL_KEY  – Key von dashboard.api-football.com (Free: 100 req/Tag)
 *   ANTHROPIC_API_KEY – Key von console.anthropic.com
 */
import Anthropic from '@anthropic-ai/sdk'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'frontend', 'public', 'predictions.json')

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const WORLD_CUP_LEAGUE_ID = 1 // API-Football: League 1 = FIFA World Cup
const SEASON = 2026

if (!API_FOOTBALL_KEY) {
  console.error('API_FOOTBALL_KEY fehlt. Demo-Daten in frontend/public/predictions.json bleiben unverändert.')
  process.exit(1)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt.')
  process.exit(1)
}

const anthropic = new Anthropic()

async function apiFootball(path, params = {}) {
  const url = new URL(`https://v3.football.api-sports.io/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { 'x-apisports-key': API_FOOTBALL_KEY } })
  if (!res.ok) throw new Error(`API-Football ${path}: HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football ${path}: ${JSON.stringify(json.errors)}`)
  }
  return json.response
}

/** Letzte 5 Spiele eines Teams als kompakte Statistik-Zusammenfassung */
async function teamForm(teamId) {
  const fixtures = await apiFootball('fixtures', { team: teamId, last: 5, status: 'FT' })
  return fixtures.map((f) => ({
    gegner: f.teams.home.id === teamId ? f.teams.away.name : f.teams.home.name,
    tore: `${f.goals.home}:${f.goals.away}`,
    heim: f.teams.home.id === teamId,
    gewonnen: (f.teams.home.id === teamId ? f.teams.home.winner : f.teams.away.winner) === true,
  }))
}

const predictionSchema = {
  type: 'object',
  properties: {
    score: {
      type: 'object',
      properties: { home: { type: 'integer' }, away: { type: 'integer' } },
      required: ['home', 'away'],
      additionalProperties: false,
    },
    confidence: { type: 'integer', description: 'Prozent 1-99' },
    expectedStats: {
      type: 'object',
      properties: {
        possession: { type: 'object', properties: { home: { type: 'integer' }, away: { type: 'integer' } }, required: ['home', 'away'], additionalProperties: false },
        shots: { type: 'object', properties: { home: { type: 'integer' }, away: { type: 'integer' } }, required: ['home', 'away'], additionalProperties: false },
        shotsOnTarget: { type: 'object', properties: { home: { type: 'integer' }, away: { type: 'integer' } }, required: ['home', 'away'], additionalProperties: false },
        corners: { type: 'object', properties: { home: { type: 'integer' }, away: { type: 'integer' } }, required: ['home', 'away'], additionalProperties: false },
      },
      required: ['possession', 'shots', 'shotsOnTarget', 'corners'],
      additionalProperties: false,
    },
    reasoning: { type: 'string', description: 'Begründung auf Deutsch, 3-5 Sätze' },
  },
  required: ['score', 'confidence', 'expectedStats', 'reasoning'],
  additionalProperties: false,
}

async function predictMatch(fixture, homeForm, awayForm) {
  const { teams } = fixture
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system:
      'Du bist ein Fußball-Analyst. Du erstellst Spielprognosen auf Basis von Team-Statistiken. ' +
      'Achte besonders darauf, dass Dominanz (Ballbesitz, Schüsse) nicht automatisch Sieg bedeutet — ' +
      'Effizienz und Defensive zählen genauso. Begründe deine Prognose nachvollziehbar auf Deutsch.',
    messages: [
      {
        role: 'user',
        content:
          `Prognose für das WM-2026-Spiel ${teams.home.name} gegen ${teams.away.name}.\n\n` +
          `Form ${teams.home.name} (letzte 5 Spiele): ${JSON.stringify(homeForm)}\n` +
          `Form ${teams.away.name} (letzte 5 Spiele): ${JSON.stringify(awayForm)}\n\n` +
          'Erstelle eine Ergebnis-Prognose mit erwarteten Statistiken und Begründung.',
      },
    ],
    output_config: { format: { type: 'json_schema', schema: predictionSchema } },
  })
  const text = response.content.find((b) => b.type === 'text')?.text
  return JSON.parse(text)
}

const main = async () => {
  console.log('Hole WM-2026-Spielplan...')
  const fixtures = await apiFootball('fixtures', {
    league: WORLD_CUP_LEAGUE_ID,
    season: SEASON,
    status: 'NS', // noch nicht gestartete Spiele
  })
  console.log(`${fixtures.length} anstehende Spiele gefunden.`)

  const matches = []
  for (const fixture of fixtures) {
    const { teams, fixture: meta, league } = fixture
    console.log(`Prognose: ${teams.home.name} vs ${teams.away.name}...`)
    try {
      const [homeForm, awayForm] = [
        await teamForm(teams.home.id),
        await teamForm(teams.away.id),
      ]
      const prediction = await predictMatch(fixture, homeForm, awayForm)
      matches.push({
        id: String(meta.id),
        group: league.round ?? 'WM 2026',
        kickoff: meta.date,
        home: { name: teams.home.name, flag: '', logo: teams.home.logo },
        away: { name: teams.away.name, flag: '', logo: teams.away.logo },
        prediction,
      })
    } catch (err) {
      console.error(`  Fehler, überspringe: ${err.message}`)
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    model: 'Claude Opus 4.8',
    demo: false,
    matches,
  }
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`${matches.length} Predictions geschrieben nach ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
