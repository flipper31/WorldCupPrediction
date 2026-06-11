/**
 * Holt den WM-2026-Spielplan inkl. Ergebnissen von openfootball
 * (public domain, kein API-Key nötig) und schreibt scripts/data/matchdata.json.
 *
 * Quelle: https://github.com/openfootball/worldcup.json
 * Die eigentliche Prediction macht Claude in der Claude Code Session.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, 'data')
const OUTPUT_PATH = join(OUTPUT_DIR, 'matchdata.json')

const SOURCE_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

const main = async () => {
  console.log('Hole WM-2026-Spielplan von openfootball...')
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`openfootball: HTTP ${res.status}`)
  const data = await res.json()

  const played = data.matches.filter((m) => m.score1 != null || m.score?.ft)
  const upcoming = data.matches.filter((m) => !(m.score1 != null || m.score?.ft))

  console.log(`${data.matches.length} Spiele gesamt, ${played.length} gespielt, ${upcoming.length} anstehend.`)

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source: SOURCE_URL,
        name: data.name,
        played,
        upcoming,
      },
      null,
      2,
    ),
  )
  console.log(`Daten geschrieben nach ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
