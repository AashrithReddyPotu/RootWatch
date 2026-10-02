import { useState } from 'react'
import type { CSSProperties } from 'react'
import { sendChatMessage } from './api/investigatorClient'
import './App.css'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

type Incident = {
  id: string
  endpoint: string
  severity: 'HIGH' | 'MEDIUM'
  error: string
  failures: number
  total: number
  deployment: string
  confidence: number
  file: string
  functionName: string
  line: number
  evidence: string[]
}

type Message = {
  sender: 'user' | 'ai'
  text: string
}

const incidents: Incident[] = [
  {
    id: 'INC-001',
    endpoint: '/api/applications',
    severity: 'HIGH',
    error: 'DATABASE_CONNECTION_TIMEOUT',
    failures: 47,
    total: 57,
    deployment: 'v1.4.8',
    confidence: 88,
    file: 'services/application_service.py',
    functionName: 'submit_application()',
    line: 24,
    evidence: [
      '47 of 57 requests failed',
      'Database timeout dominates errors',
      'Failures began after v1.4.8',
      'application_service.py changed',
    ],
  },
  {
    id: 'INC-002',
    endpoint: '/api/profile',
    severity: 'MEDIUM',
    error: 'AUTH_TOKEN_ERROR',
    failures: 12,
    total: 48,
    deployment: 'v1.4.7',
    confidence: 76,
    file: 'services/auth_service.py',
    functionName: 'validate_token()',
    line: 41,
    evidence: [
      '12 of 48 requests failed',
      'Authentication errors dominate',
      'Failures affect authenticated traffic',
      'Token validation is a likely source',
    ],
  },
]

const telemetry = [
  24, 31, 27, 43, 38, 55, 48, 61, 52, 73, 59, 68, 82, 64, 72, 57, 69, 48,
  61, 43, 53, 39, 46, 34, 42, 29, 36, 26, 33, 22,
]

const trafficBars = [
  32, 45, 38, 57, 44, 68, 53, 75, 62, 84, 69, 91, 73, 87, 65, 77, 58, 70,
  49, 62, 42, 55, 37, 48,
]

function buildWave(values: number[]) {
  const width = 1000
  const height = 250

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - (value / 100) * height
      return `${x},${y}`
    })
    .join(' ')
}

function getResponse(incident: Incident, question: string) {
  const q = question.toLowerCase()

  if (q.includes('where') || q.includes('code') || q.includes('file')) {
    return `Investigate ${incident.file}, specifically ${incident.functionName} near line ${incident.line}. This is the strongest code location based on the current incident evidence.`
  }

  if (q.includes('why') || q.includes('cause') || q.includes('root')) {
    if (incident.id === 'INC-001') {
      return 'The strongest hypothesis is database connection exhaustion or improper connection cleanup. The timeout spike began after deployment v1.4.8 and correlates with changes to the application service.'
    }

    return 'The strongest hypothesis is a token validation failure in the authentication path. AUTH_TOKEN_ERROR dominates the recent failures for authenticated profile requests.'
  }

  if (q.includes('fix') || q.includes('solution')) {
    if (incident.id === 'INC-001') {
      return 'Inspect connection lifecycle handling in submit_application(). Ensure connections are released on every exception path and validate the database pool configuration.'
    }

    return 'Inspect validate_token(), token expiration handling, signature verification, and recent authentication configuration changes.'
  }

  return `RootWatch has correlated ${incident.failures} failures with ${incident.error}. Current confidence is ${incident.confidence}%. The strongest code lead is ${incident.file}.`
}

function App() {
  const [selectedId, setSelectedId] = useState('INC-001')
  const [question, setQuestion] = useState('')
  const [thinking, setThinking] = useState(false)

  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'INC-001': [
      {
        sender: 'ai',
        text: 'Telemetry correlation detected a sharp database timeout spike shortly after deployment v1.4.8. RootWatch is investigating application-service changes.',
      },
    ],
    'INC-002': [
      {
        sender: 'ai',
        text: 'Authentication failures are concentrated around profile requests. Token validation is the strongest current investigation path.',
      },
    ],
  })

  const incident =
    incidents.find((item) => item.id === selectedId) ?? incidents[0]

  const failureRate = Math.round(
    (incident.failures / incident.total) * 100,
  )

  const totalFailures = incidents.reduce(
    (sum, item) => sum + item.failures,
    0,
  )

  const sendMessage = async () => {
    const value = question.trim()

    if (!value || thinking) return

    const incidentId = incident.id

    setMessages((previous) => ({
      ...previous,
      [incidentId]: [
        ...(previous[incidentId] ?? []),
        {
          sender: 'user',
          text: value,
        },
      ],
    }))

    setQuestion('')
    setThinking(true)

    try {
      if (USE_MOCKS) {
        await new Promise((resolve) => window.setTimeout(resolve, 600))

        const mockResponse = getResponse(incident, value)

        setMessages((previous) => ({
          ...previous,
          [incidentId]: [
            ...(previous[incidentId] ?? []),
            {
              sender: 'ai',
              text: mockResponse,
            },
          ],
        }))
      } else {
        const response = await sendChatMessage({
          incident_id: incidentId,
          message: value,
        })

        setMessages((previous) => ({
          ...previous,
          [incidentId]: [
            ...(previous[incidentId] ?? []),
            {
              sender: 'ai',
              text: response.answer,
            },
          ],
        }))
      }
    } catch (error) {
      console.error('RootWatch investigator API error:', error)

      const fallback = getResponse(incident, value)

      setMessages((previous) => ({
        ...previous,
        [incidentId]: [
          ...(previous[incidentId] ?? []),
          {
            sender: 'ai',
            text: `${fallback} Local investigation fallback activated because the AI service is currently unavailable.`,
          },
        ],
      }))
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div>
            <h1>ROOTWATCH</h1>
            <p>AI INCIDENT INTELLIGENCE</p>
          </div>
        </div>

        <div className="topbar-center">
          <span className="live-dot"></span>
          LIVE OBSERVABILITY
        </div>

        <div className="system-health">
          <span>PLATFORM</span>
          <strong>OPERATIONAL</strong>
        </div>
      </header>

      <main className="command-center">
        <section className="metric-row">
          <div className="metric">
            <span>ACTIVE INCIDENTS</span>
            <strong>{incidents.length}</strong>
            <small>Requires investigation</small>
          </div>

          <div className="metric">
            <span>TOTAL FAILURES</span>
            <strong>{totalFailures}</strong>
            <small>Current monitoring window</small>
          </div>

          <div className="metric">
            <span>AFFECTED SERVICES</span>
            <strong>02</strong>
            <small>Applications / Profile</small>
          </div>

          <div className="metric accent-metric">
            <span>CRITICAL FAILURE RATE</span>
            <strong>{failureRate}%</strong>
            <small>Selected incident</small>
          </div>

          <div className="metric">
            <span>AI CONFIDENCE</span>
            <strong>{incident.confidence}%</strong>
            <small>Evidence correlation</small>
          </div>
        </section>

        <section className="monitor-grid">
          <aside className="left-column">
            <div className="hud-card incident-list-card">
              <div className="card-heading">
                <span>INCIDENT STREAM</span>
                <small>{incidents.length} ACTIVE</small>
              </div>

              {incidents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`incident-button ${
                    item.id === incident.id ? 'active' : ''
                  }`}
                  onClick={() => {
                    setSelectedId(item.id)
                    setQuestion('')
                  }}
                >
                  <div className="incident-button-top">
                    <strong>{item.id}</strong>

                    <span
                      className={`severity ${item.severity.toLowerCase()}`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <b>{item.endpoint}</b>

                  <code>{item.error}</code>

                  <div className="incident-footer">
                    <span>{item.failures} FAILURES</span>
                    <span>{item.deployment}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="hud-card distribution-card">
              <div className="card-heading">
                <span>ERROR DISTRIBUTION</span>
              </div>

              <div className="error-row">
                <div>
                  <span>DATABASE</span>
                  <strong>79%</strong>
                </div>

                <div className="bar-track">
                  <div className="bar-fill database"></div>
                </div>
              </div>

              <div className="error-row">
                <div>
                  <span>AUTH</span>
                  <strong>20%</strong>
                </div>

                <div className="bar-track">
                  <div className="bar-fill auth"></div>
                </div>
              </div>

              <div className="error-row">
                <div>
                  <span>OTHER</span>
                  <strong>1%</strong>
                </div>

                <div className="bar-track">
                  <div className="bar-fill other"></div>
                </div>
              </div>
            </div>
          </aside>

          <section className="center-column">
            <div className="hud-card telemetry-card">
              <div className="telemetry-header">
                <div>
                  <span className="hud-label">
                    LIVE FAILURE TELEMETRY
                  </span>

                  <h2>{incident.endpoint}</h2>

                  <p>{incident.error}</p>
                </div>

                <div className="gauge">
                  <div
                    className="gauge-ring"
                    style={
                      {
                        '--rate': `${failureRate * 3.6}deg`,
                      } as CSSProperties
                    }
                  >
                    <div className="gauge-inner">
                      <strong>{failureRate}%</strong>
                      <span>FAILURE RATE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="telemetry-chart">
                <div className="chart-grid"></div>

                <svg
                  viewBox="0 0 1000 250"
                  preserveAspectRatio="none"
                  className="wave-svg"
                >
                  <defs>
                    <linearGradient
                      id="areaGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#20e3d2"
                        stopOpacity="0.35"
                      />

                      <stop
                        offset="100%"
                        stopColor="#20e3d2"
                        stopOpacity="0"
                      />
                    </linearGradient>

                    <filter id="glow">
                      <feGaussianBlur
                        stdDeviation="5"
                        result="blur"
                      />

                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <polygon
                    points={`0,250 ${buildWave(telemetry)} 1000,250`}
                    fill="url(#areaGradient)"
                  />

                  <polyline
                    points={buildWave(telemetry)}
                    fill="none"
                    stroke="#21e6d7"
                    strokeWidth="3"
                    filter="url(#glow)"
                  />

                  <polyline
                    points={buildWave(
                      telemetry.map((value) =>
                        Math.max(5, value - 17),
                      ),
                    )}
                    fill="none"
                    stroke="#3b82f6"
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                  />
                </svg>

                <div className="chart-labels">
                  <span>-120s</span>
                  <span>-90s</span>
                  <span>-60s</span>
                  <span>-30s</span>
                  <span>NOW</span>
                </div>
              </div>

              <div className="telemetry-footer">
                <div>
                  <span>FAILURES</span>
                  <strong>{incident.failures}</strong>
                </div>

                <div>
                  <span>REQUESTS</span>
                  <strong>{incident.total}</strong>
                </div>

                <div>
                  <span>DEPLOYMENT</span>
                  <strong>{incident.deployment}</strong>
                </div>

                <div>
                  <span>STATUS</span>
                  <strong className="danger-text">
                    DEGRADED
                  </strong>
                </div>
              </div>
            </div>

            <div className="bottom-analytics">
              <div className="hud-card traffic-card">
                <div className="card-heading">
                  <span>REQUEST ACTIVITY</span>
                  <small>LAST 24 INTERVALS</small>
                </div>

                <div className="traffic-bars">
                  {trafficBars.map((height, index) => (
                    <div
                      key={index}
                      className="traffic-bar"
                      style={{
                        height: `${height}%`,
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="hud-card deployment-card">
                <div className="card-heading">
                  <span>DEPLOYMENT CORRELATION</span>
                </div>

                <div className="deployment-version">
                  <span>VERSION</span>
                  <strong>{incident.deployment}</strong>
                </div>

                <div className="deployment-line">
                  <span className="deployment-node old"></span>
                  <span className="deployment-path"></span>
                  <span className="deployment-node current"></span>
                </div>

                <div className="deployment-status">
                  <span>BEFORE</span>
                  <strong>FAILURE SPIKE</strong>
                  <span>NOW</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="right-column">
            <div className="hud-card ai-card">
              <div className="card-heading">
                <span>AI ROOT CAUSE ANALYSIS</span>
                <small className="ai-online">
                  ● ONLINE
                </small>
              </div>

              <div className="confidence-display">
                <div
                  className="confidence-ring"
                  style={
                    {
                      '--confidence': `${incident.confidence * 3.6}deg`,
                    } as CSSProperties
                  }
                >
                  <div>
                    <strong>
                      {incident.confidence}%
                    </strong>

                    <span>CONFIDENCE</span>
                  </div>
                </div>
              </div>

              <div className="root-cause">
                <span>LIKELY ROOT CAUSE</span>

                <strong>
                  {incident.id === 'INC-001'
                    ? 'Database connection lifecycle'
                    : 'Authentication token validation'}
                </strong>
              </div>

              <div className="evidence-list">
                {incident.evidence.map((item, index) => (
                  <div
                    className="evidence-line"
                    key={index}
                  >
                    <span>✓</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-card code-location-card">
              <div className="card-heading">
                <span>CODE TRACE</span>
              </div>

              <div className="code-window">
                <div className="window-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>

                <span>FILE</span>
                <strong>{incident.file}</strong>

                <span>FUNCTION</span>
                <strong>{incident.functionName}</strong>

                <span>LINE</span>
                <strong>{incident.line}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="hud-card investigator-console">
          <div className="console-heading">
            <div>
              <span className="console-icon">
                AI
              </span>

              <div>
                <strong>
                  ROOTWATCH INVESTIGATOR
                </strong>

                <small>
                  Evidence-grounded incident reasoning
                </small>
              </div>
            </div>

            <span className="console-status">
              ● ANALYSIS ENGINE READY
            </span>
          </div>

          <div className="console-messages">
            {(messages[incident.id] ?? []).map(
              (message, index) => (
                <div
                  key={index}
                  className={`console-message ${message.sender}`}
                >
                  <span>
                    {message.sender === 'ai'
                      ? 'ROOTWATCH AI'
                      : 'ENGINEER'}
                  </span>

                  <p>{message.text}</p>
                </div>
              ),
            )}

            {thinking && (
              <div className="console-message ai">
                <span>ROOTWATCH AI</span>

                <p className="analyzing">
                  Correlating telemetry, deployment and code evidence...
                </p>
              </div>
            )}
          </div>

          <div className="console-input">
            <span className="prompt-symbol">
              ›
            </span>

            <input
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void sendMessage()
                }
              }}
              placeholder={`Investigate ${incident.id}...`}
            />

            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={thinking}
            >
              {thinking
                ? 'ANALYZING'
                : 'INVESTIGATE'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App