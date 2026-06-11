import { useEffect, useState } from 'react'
import './App.css'

function ConfidenceBar({ value }) {
  return (
    <div className="confidence">
      <div className="confidence-track">
        <div className="confidence-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="confidence-label">{value}% sicher</span>
    </div>
  )
}

function StatRow({ label, home, away, isPercent }) {
  const h = parseFloat(home) || 0
  const a = parseFloat(away) || 0
  const total = h + a || 1
  return (
    <div className="stat-row">
      <span className="stat-value">{home}{isPercent ? '%' : ''}</span>
      <div className="stat-bars">
        <span className="stat-label">{label}</span>
        <div className="stat-track">
          <div className="stat-home" style={{ width: `${(h / total) * 100}%` }} />
          <div className="stat-away" style={{ width: `${(a / total) * 100}%` }} />
        </div>
      </div>
      <span className="stat-value">{away}{isPercent ? '%' : ''}</span>
    </div>
  )
}

function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false)
  const { home, away, prediction, kickoff, group } = match
  const date = new Date(kickoff)

  return (
    <div className="match-card" onClick={() => setExpanded(!expanded)}>
      <div className="match-meta">
        <span>{group}</span>
        <span>
          {date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
        </span>
      </div>

      <div className="match-teams">
        <div className="team">
          <span className="team-flag">{home.flag}</span>
          <span className="team-name">{home.name}</span>
        </div>
        <div className="match-score">
          <span className="score">{prediction.score.home} : {prediction.score.away}</span>
          <span className="score-tag">Prognose</span>
        </div>
        <div className="team">
          <span className="team-flag">{away.flag}</span>
          <span className="team-name">{away.name}</span>
        </div>
      </div>

      <ConfidenceBar value={prediction.confidence} />

      {expanded && (
        <div className="match-details">
          {prediction.expectedStats && (
            <div className="stats-block">
              <h4>Erwartete Statistiken</h4>
              <StatRow label="Ballbesitz" home={prediction.expectedStats.possession.home} away={prediction.expectedStats.possession.away} isPercent />
              <StatRow label="Torschüsse" home={prediction.expectedStats.shots.home} away={prediction.expectedStats.shots.away} />
              <StatRow label="Schüsse aufs Tor" home={prediction.expectedStats.shotsOnTarget.home} away={prediction.expectedStats.shotsOnTarget.away} />
              <StatRow label="Ecken" home={prediction.expectedStats.corners.home} away={prediction.expectedStats.corners.away} />
            </div>
          )}
          <div className="reasoning">
            <h4>Warum die AI das denkt</h4>
            <p>{prediction.reasoning}</p>
          </div>
        </div>
      )}

      <div className="expand-hint">{expanded ? '▲ weniger' : '▼ Begründung & Stats'}</div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('predictions.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="status">Fehler beim Laden der Predictions: {error}</div>
  if (!data) return <div className="status">Lade Predictions…</div>

  return (
    <div className="app">
      <header>
        <h1>⚽ WM 2026 AI Predictions</h1>
        <p className="subtitle">
          Spielprognosen mit KI-Begründung — basierend auf Team-Statistiken wie
          Torschüssen, Ballbesitz und Form.
        </p>
        {data.demo && (
          <div className="demo-banner">
            ⚠️ Demo-Daten — echte Predictions folgen sobald die API-Keys eingerichtet sind.
          </div>
        )}
        <p className="generated">
          Stand: {new Date(data.generatedAt).toLocaleString('de-DE')} · Modell: {data.model}
        </p>
      </header>

      <main>
        {data.matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </main>

      <footer>
        Predictions sind KI-generiert und keine Wett-Empfehlung.
      </footer>
    </div>
  )
}
