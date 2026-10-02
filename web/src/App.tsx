import { useMemo, useState } from 'react'
import { sendChatMessage } from './api/investigatorClient'
import './App.css'

type Incident = {
  id: string
  endpoint: string
  severity: 'HIGH' | 'MEDIUM'
  error: string
  failures: number
  requests: number
  failureRate: number
  deployment: string
  confidence: number
  service: string
  file: string
  functionName: string
  line: number
  rootCause: string
  evidence: string[]
}

type ChatMessage = {
  role: 'ai' | 'user'
  text: string
}

const incidents: Incident[] = [
  {
    id: 'INC-001',
    endpoint: '/api/applications',
    severity: 'HIGH',
    error: 'DATABASE_CONNECTION_TIMEOUT',
    failures: 47,
    requests: 57,
    failureRate: 82,
    deployment: 'v1.4.8',
    confidence: 88,
    service: 'Application Service',
    file: 'services/application_service.py',
    functionName: 'submit_application()',
    line: 24,
    rootCause: 'Database connection lifecycle',
    evidence: [
      '47 of 57 requests failed',
      'Database timeout dominates recent errors',
      'Failure spike began after deployment v1.4.8',
      'application_service.py changed in deployment',
    ],
  },
  {
    id: 'INC-002',
    endpoint: '/api/profile',
    severity: 'MEDIUM',
    error: 'AUTH_TOKEN_ERROR',
    failures: 12,
    requests: 48,
    failureRate: 25,
    deployment: 'v1.4.7',
    confidence: 76,
    service: 'Profile Service',
    file: 'services/auth_service.py',
    functionName: 'validate_token()',
    line: 41,
    rootCause: 'Authentication token validation',
    evidence: [
      '12 of 48 profile requests failed',
      'AUTH_TOKEN_ERROR dominates profile failures',
      'Failures affect authenticated requests',
      'Token validation path requires investigation',
    ],
  },
]

const trendData = [
  18, 22, 20, 29, 26, 37, 32, 43, 36, 51, 42, 48,
  60, 45, 53, 39, 49, 31, 43, 28, 36, 25, 31, 21,
]

const requestBars = [
  35, 52, 44, 65, 51, 74, 59, 82, 69, 91, 75, 96,
  78, 89, 67, 81, 61, 73, 54, 68, 49, 62, 43, 56,
]

function createLine(values: number[]) {
  const width = 1000
  const height = 240
  const max = Math.max(...values)

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - (value / max) * 190 - 20
      return `${x},${y}`
    })
    .join(' ')
}

function mockAnswer(incident: Incident, message: string) {
  const text = message.toLowerCase()

  if (
    text.includes('where') ||
    text.includes('code') ||
    text.includes('file')
  ) {
    return `The strongest code location is ${incident.file}. Inspect ${incident.functionName} near line ${incident.line}.`
  }

  if (
    text.includes('why') ||
    text.includes('cause') ||
    text.includes('root')
  ) {
    return `The current evidence suggests ${incident.rootCause.toLowerCase()} as the likely root cause. RootWatch correlated the failure pattern with deployment ${incident.deployment}.`
  }

  if (
    text.includes('fix') ||
    text.includes('solution') ||
    text.includes('resolve')
  ) {
    if (incident.id === 'INC-001') {
      return 'Review database connection cleanup paths, verify connections are released during exceptions, and inspect the connection pool configuration.'
    }

    return 'Review token validation, expiration handling, signature verification, and recent authentication configuration changes.'
  }

  return `RootWatch detected ${incident.failures} failures across ${incident.requests} requests for ${incident.endpoint}. The current AI confidence is ${incident.confidence}%.`
}

function FailureChart({ incident }: { incident: Incident }) {
  return (
    <article className="panel trend-panel">
      <div className="panel-header">
        <div>
          <span>REAL-TIME TELEMETRY</span>
          <h2>Failure Trend</h2>
        </div>

        <div className="trend-legend">
          <span>
            <i className="legend-failure"></i>
            Failures
          </span>

          <span>
            <i className="legend-baseline"></i>
            Baseline
          </span>
        </div>
      </div>

      <div className="incident-title-row">
        <div>
          <strong>{incident.endpoint}</strong>
          <span>{incident.error}</span>
        </div>

        <div className="incident-rate">
          <strong>{incident.failureRate}%</strong>
          <span>FAILURE RATE</span>
        </div>
      </div>

      <div className="trend-chart">
        <div className="chart-grid-lines"></div>

        <svg
          viewBox="0 0 1000 240"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="failureArea"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#4f7cff"
                stopOpacity=".42"
              />

              <stop
                offset="100%"
                stopColor="#4f7cff"
                stopOpacity="0"
              />
            </linearGradient>

            <filter id="lineGlow">
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
            points={`0,240 ${createLine(
              trendData,
            )} 1000,240`}
            fill="url(#failureArea)"
          />

          <polyline
            points={createLine(trendData)}
            fill="none"
            stroke="#5d8cff"
            strokeWidth="4"
            filter="url(#lineGlow)"
          />

          <polyline
            points={createLine(
              trendData.map((value) =>
                Math.max(10, value - 13),
              ),
            )}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeOpacity=".65"
          />
        </svg>

        <div className="time-labels">
          <span>-120s</span>
          <span>-90s</span>
          <span>-60s</span>
          <span>-30s</span>
          <span>NOW</span>
        </div>
      </div>

      <div className="trend-footer">
        <div>
          <span>FAILURES</span>
          <strong>{incident.failures}</strong>
        </div>

        <div>
          <span>REQUESTS</span>
          <strong>{incident.requests}</strong>
        </div>

        <div>
          <span>SERVICE</span>
          <strong>{incident.service}</strong>
        </div>

        <div>
          <span>STATUS</span>
          <strong className="degraded">
            DEGRADED
          </strong>
        </div>
      </div>
    </article>
  )
}

function ErrorDistribution() {
  return (
    <article className="panel distribution-panel">
      <div className="panel-header">
        <div>
          <span>CLASSIFICATION</span>
          <h2>Error Distribution</h2>
        </div>
      </div>

      <div className="donut-wrapper">
        <div className="donut">
          <div className="donut-center">
            <strong>59</strong>
            <span>ERRORS</span>
          </div>
        </div>
      </div>

      <div className="distribution-list">
        <div>
          <span>
            <i className="db-color"></i>
            Database
          </span>
          <strong>79%</strong>
        </div>

        <div>
          <span>
            <i className="auth-color"></i>
            Authentication
          </span>
          <strong>20%</strong>
        </div>

        <div>
          <span>
            <i className="other-color"></i>
            Other
          </span>
          <strong>1%</strong>
        </div>
      </div>
    </article>
  )
}

function RequestActivity() {
  return (
    <article className="panel request-panel">
      <div className="panel-header">
        <div>
          <span>TRAFFIC</span>
          <h2>Request Activity</h2>
        </div>

        <small>LAST 24 INTERVALS</small>
      </div>

      <div className="request-chart">
        {requestBars.map((height, index) => (
          <div
            key={index}
            className="request-bar-wrap"
          >
            <div
              className="request-bar"
              style={{
                height: `${height}%`,
              }}
            ></div>
          </div>
        ))}
      </div>

      <div className="request-axis">
        <span>-24m</span>
        <span>-18m</span>
        <span>-12m</span>
        <span>-6m</span>
        <span>NOW</span>
      </div>
    </article>
  )
}

function DeploymentImpact({
  incident,
}: {
  incident: Incident
}) {
  return (
    <article className="panel deployment-panel">
      <div className="panel-header">
        <div>
          <span>CORRELATION</span>
          <h2>Deployment Impact</h2>
        </div>

        <strong className="version-number">
          {incident.deployment}
        </strong>
      </div>

      <div className="deployment-chart">
        <div className="deployment-labels">
          <span>BEFORE DEPLOYMENT</span>
          <span>AFTER DEPLOYMENT</span>
        </div>

        <div className="deployment-track">
          <div className="deployment-before"></div>

          <div className="deployment-marker">
            <span>DEPLOY</span>
          </div>

          <div className="deployment-after"></div>
        </div>

        <div className="deployment-numbers">
          <div>
            <strong>4%</strong>
            <span>Baseline errors</span>
          </div>

          <div className="increase">
            <strong>
              {incident.failureRate}%
            </strong>
            <span>Current failures</span>
          </div>
        </div>
      </div>
    </article>
  )
}

function EvidencePanel({
  incident,
}: {
  incident: Incident
}) {
  return (
    <article className="panel ai-panel">
      <div className="panel-header">
        <div>
          <span>ROOTWATCH AI</span>
          <h2>Root Cause Analysis</h2>
        </div>

        <div className="ai-online">
          <i></i>
          ONLINE
        </div>
      </div>

      <div className="ai-analysis-grid">
        <div className="confidence-section">
          <div
            className="confidence-circle"
            style={{
              background: `conic-gradient(#8b5cf6 0deg ${
                incident.confidence * 3.6
              }deg, #252b49 ${
                incident.confidence * 3.6
              }deg 360deg)`,
            }}
          >
            <div>
              <strong>
                {incident.confidence}%
              </strong>
              <span>CONFIDENCE</span>
            </div>
          </div>

          <div className="cause-box">
            <span>LIKELY ROOT CAUSE</span>
            <strong>
              {incident.rootCause}
            </strong>
          </div>
        </div>

        <div className="evidence-section">
          <span className="evidence-heading">
            SUPPORTING EVIDENCE
          </span>

          {incident.evidence.map(
            (item, index) => (
              <div
                className="evidence-item"
                key={index}
              >
                <span>✓</span>
                <p>{item}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </article>
  )
}

function CodePanel({
  incident,
}: {
  incident: Incident
}) {
  return (
    <article className="panel code-panel">
      <div className="panel-header">
        <div>
          <span>SOURCE ANALYSIS</span>
          <h2>Likely Code Location</h2>
        </div>

        <div className="code-confidence">
          HIGH MATCH
        </div>
      </div>

      <div className="code-window">
        <div className="code-window-header">
          <div>
            <i></i>
            <i></i>
            <i></i>
          </div>

          <span>ROOTWATCH CODE TRACE</span>
        </div>

        <div className="code-row">
          <span>FILE</span>
          <strong>{incident.file}</strong>
        </div>

        <div className="code-row">
          <span>FUNCTION</span>
          <strong>{incident.functionName}</strong>
        </div>

        <div className="code-row">
          <span>LINE</span>
          <strong>{incident.line}</strong>
        </div>

        <div className="code-preview">
          <span>21</span>
          <code>
            connection = get_connection()
          </code>

          <span>22</span>
          <code>validate_request(data)</code>

          <span className="highlight-line">
            {incident.line}
          </span>

          <code className="highlight-code">
            process_application(connection)
          </code>

          <span>25</span>
          <code>return result</code>
        </div>
      </div>
    </article>
  )
}

function IncidentSelector({
  incident,
  setSelectedId,
}: {
  incident: Incident
  setSelectedId: (id: string) => void
}) {
  return (
    <article className="panel incidents-panel">
      <div className="panel-header">
        <div>
          <span>LIVE FEED</span>
          <h2>Active Incidents</h2>
        </div>

        <div className="active-count">
          {incidents.length} ACTIVE
        </div>
      </div>

      <div className="incident-stack">
        {incidents.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`incident-card ${
              incident.id === item.id
                ? 'selected'
                : ''
            }`}
            onClick={() =>
              setSelectedId(item.id)
            }
          >
            <div className="incident-top">
              <strong>{item.id}</strong>

              <span
                className={`severity ${item.severity.toLowerCase()}`}
              >
                {item.severity}
              </span>
            </div>

            <h3>{item.endpoint}</h3>
            <p>{item.error}</p>

            <div className="incident-meta">
              <span>
                {item.failures} failures
              </span>
              <span>
                {item.failureRate}%
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="incident-summary">
        <span>MONITORED SERVICES</span>
        <strong>4</strong>

        <div className="service-health">
          <div>
            <i className="healthy"></i>
            Careers
          </div>

          <div>
            <i className="healthy"></i>
            Jobs
          </div>

          <div>
            <i className="critical"></i>
            Applications
          </div>

          <div>
            <i className="warning"></i>
            Profile
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterBar() {
  return (
    <section className="filter-row">
      <div className="filter-title">
        <span>MONITORING SCOPE</span>
      </div>

      <div className="filter">
        <span>SERVICE</span>
        <strong>All Services⌄</strong>
      </div>

      <div className="filter">
        <span>ENVIRONMENT</span>
        <strong>Production⌄</strong>
      </div>

      <div className="filter">
        <span>SEVERITY</span>
        <strong>All Levels⌄</strong>
      </div>

      <div className="filter">
        <span>WINDOW</span>
        <strong>Last 2 Minutes⌄</strong>
      </div>
    </section>
  )
}

function KpiCards({
  incident,
}: {
  incident: Incident
}) {
  const totalFailures = incidents.reduce(
    (sum, item) => sum + item.failures,
    0,
  )

  return (
    <section className="kpi-grid">
      <article className="kpi-card blue">
        <div>
          <span>ACTIVE INCIDENTS</span>
          <strong>{incidents.length}</strong>
        </div>
        <div className="kpi-icon">!</div>
        <small>Requires investigation</small>
      </article>

      <article className="kpi-card purple">
        <div>
          <span>TOTAL FAILURES</span>
          <strong>{totalFailures}</strong>
        </div>
        <div className="kpi-icon">↗</div>
        <small>Current monitoring window</small>
      </article>

      <article className="kpi-card cyan">
        <div>
          <span>AFFECTED SERVICES</span>
          <strong>02</strong>
        </div>
        <div className="kpi-icon">⌁</div>
        <small>Applications / Profile</small>
      </article>

      <article className="kpi-card red">
        <div>
          <span>FAILURE RATE</span>
          <strong>{incident.failureRate}%</strong>
        </div>
        <div className="kpi-icon">▲</div>
        <small>{incident.endpoint}</small>
      </article>

      <article className="kpi-card green">
        <div>
          <span>AI CONFIDENCE</span>
          <strong>{incident.confidence}%</strong>
        </div>
        <div className="kpi-icon">✦</div>
        <small>Evidence correlation</small>
      </article>
    </section>
  )
}

function App() {
  const [selectedId, setSelectedId] =
    useState('INC-001')

  const [activeView, setActiveView] =
    useState('Dashboard')

  const [question, setQuestion] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [messages, setMessages] = useState<
    Record<string, ChatMessage[]>
  >({
    'INC-001': [
      {
        role: 'ai',
        text: 'RootWatch correlated the failure spike with deployment v1.4.8. Database connection handling is the strongest investigation path.',
      },
    ],
    'INC-002': [
      {
        role: 'ai',
        text: 'RootWatch detected concentrated authentication failures affecting profile requests. Token validation is the strongest current lead.',
      },
    ],
  })

  const incident = useMemo(
    () =>
      incidents.find(
        (item) => item.id === selectedId,
      ) ?? incidents[0],
    [selectedId],
  )

  async function handleSend() {
    const message = question.trim()

    if (!message || loading) return

    const currentId = incident.id

    setMessages((previous) => ({
      ...previous,
      [currentId]: [
        ...(previous[currentId] ?? []),
        {
          role: 'user',
          text: message,
        },
      ],
    }))

    setQuestion('')
    setLoading(true)

    try {
      const useMocks =
        import.meta.env.VITE_USE_MOCKS !==
        'false'

      let answer = ''

      if (useMocks) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 550),
        )

        answer = mockAnswer(
          incident,
          message,
        )
      } else {
        const response =
          await sendChatMessage({
            incident_id: incident.id,
            message,
          })

        answer = response.answer
      }

      setMessages((previous) => ({
        ...previous,
        [currentId]: [
          ...(previous[currentId] ?? []),
          {
            role: 'ai',
            text: answer,
          },
        ],
      }))
    } catch {
      setMessages((previous) => ({
        ...previous,
        [currentId]: [
          ...(previous[currentId] ?? []),
          {
            role: 'ai',
            text: `${mockAnswer(
              incident,
              message,
            )} Local investigation fallback is active.`,
          },
        ],
      }))
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    'Dashboard',
    'Incidents',
    'Analytics',
    'AI Investigator',
    'Code Trace',
  ]

  function InvestigatorChat() {
    return (
      <section className="investigator">
        <div className="investigator-header">
          <div>
            <div className="ai-symbol">✦</div>

            <div>
              <span>
                ROOTWATCH INVESTIGATOR
              </span>
              <h2>
                Ask about {incident.id}
              </h2>
            </div>
          </div>

          <div className="engine-status">
            <span></span>
            ANALYSIS ENGINE READY
          </div>
        </div>

        <div className="chat-messages">
          {(messages[incident.id] ?? []).map(
            (message, index) => (
              <div
                key={index}
                className={`chat-message ${message.role}`}
              >
                <span>
                  {message.role === 'ai'
                    ? 'ROOTWATCH AI'
                    : 'ENGINEER'}
                </span>

                <p>{message.text}</p>
              </div>
            ),
          )}

          {loading && (
            <div className="chat-message ai">
              <span>ROOTWATCH AI</span>
              <p className="thinking">
                Correlating telemetry,
                deployment and source
                evidence...
              </p>
            </div>
          )}
        </div>

        <div className="chat-input">
          <div className="terminal-symbol">
            ›
          </div>

          <input
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSend()
              }
            }}
            placeholder="Ask RootWatch why this incident is happening..."
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading}
          >
            <span>✦</span>
            {loading
              ? 'ANALYZING'
              : 'INVESTIGATE'}
          </button>
        </div>
      </section>
    )
  }

  function DashboardView() {
    return (
      <main className="dashboard">
        <FilterBar />

        <KpiCards incident={incident} />

        <section className="dashboard-grid">
          <IncidentSelector
            incident={incident}
            setSelectedId={setSelectedId}
          />

          <FailureChart
            incident={incident}
          />

          <ErrorDistribution />

          <RequestActivity />

          <DeploymentImpact
            incident={incident}
          />

          <EvidencePanel
            incident={incident}
          />

          <CodePanel incident={incident} />
        </section>

        <InvestigatorChat />
      </main>
    )
  }

  function IncidentsView() {
    return (
      <main className="dashboard">
        <section className="filter-row">
          <div className="filter-title">
            <span>INCIDENT MANAGEMENT</span>
          </div>

          <div className="filter">
            <span>STATUS</span>
            <strong>Active⌄</strong>
          </div>

          <div className="filter">
            <span>SEVERITY</span>
            <strong>All Levels⌄</strong>
          </div>

          <div className="filter">
            <span>SERVICE</span>
            <strong>All Services⌄</strong>
          </div>

          <div className="filter">
            <span>SORT</span>
            <strong>Highest Risk⌄</strong>
          </div>
        </section>

        <KpiCards incident={incident} />

        <section className="dashboard-grid">
          <IncidentSelector
            incident={incident}
            setSelectedId={setSelectedId}
          />

          <article className="panel trend-panel">
            <div className="panel-header">
              <div>
                <span>
                  INCIDENT DETAILS
                </span>
                <h2>{incident.id}</h2>
              </div>

              <span
                className={`severity ${incident.severity.toLowerCase()}`}
              >
                {incident.severity}
              </span>
            </div>

            <div className="incident-title-row">
              <div>
                <strong>
                  {incident.endpoint}
                </strong>
                <span>
                  {incident.error}
                </span>
              </div>

              <div className="incident-rate">
                <strong>
                  {incident.failureRate}%
                </strong>
                <span>FAILURE RATE</span>
              </div>
            </div>

            <div className="ai-analysis-grid">
              <div className="confidence-section">
                <div
                  className="confidence-circle"
                  style={{
                    background: `conic-gradient(#8b5cf6 0deg ${
                      incident.confidence *
                      3.6
                    }deg, #252b49 ${
                      incident.confidence *
                      3.6
                    }deg 360deg)`,
                  }}
                >
                  <div>
                    <strong>
                      {incident.confidence}%
                    </strong>
                    <span>
                      CONFIDENCE
                    </span>
                  </div>
                </div>

                <div className="cause-box">
                  <span>
                    LIKELY ROOT CAUSE
                  </span>
                  <strong>
                    {incident.rootCause}
                  </strong>
                </div>
              </div>

              <div className="evidence-section">
                <span className="evidence-heading">
                  INCIDENT EVIDENCE
                </span>

                {incident.evidence.map(
                  (item, index) => (
                    <div
                      className="evidence-item"
                      key={index}
                    >
                      <span>✓</span>
                      <p>{item}</p>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="trend-footer">
              <div>
                <span>FAILURES</span>
                <strong>
                  {incident.failures}
                </strong>
              </div>

              <div>
                <span>REQUESTS</span>
                <strong>
                  {incident.requests}
                </strong>
              </div>

              <div>
                <span>DEPLOYMENT</span>
                <strong>
                  {incident.deployment}
                </strong>
              </div>

              <div>
                <span>STATUS</span>
                <strong className="degraded">
                  DEGRADED
                </strong>
              </div>
            </div>
          </article>

          <CodePanel incident={incident} />

          <FailureChart
            incident={incident}
          />

          <DeploymentImpact
            incident={incident}
          />

          <ErrorDistribution />
        </section>
      </main>
    )
  }

  function AnalyticsView() {
    return (
      <main className="dashboard">
        <FilterBar />

        <section className="kpi-grid">
          <article className="kpi-card blue">
            <div>
              <span>
                REQUEST VOLUME
              </span>
              <strong>105</strong>
            </div>
            <div className="kpi-icon">
              ↗
            </div>
            <small>
              Current observation window
            </small>
          </article>

          <article className="kpi-card purple">
            <div>
              <span>
                ERROR EVENTS
              </span>
              <strong>59</strong>
            </div>
            <div className="kpi-icon">
              !
            </div>
            <small>
              Across monitored services
            </small>
          </article>

          <article className="kpi-card cyan">
            <div>
              <span>
                HEALTHY SERVICES
              </span>
              <strong>02</strong>
            </div>
            <div className="kpi-icon">
              ✓
            </div>
            <small>
              Careers and Jobs
            </small>
          </article>

          <article className="kpi-card red">
            <div>
              <span>
                PEAK FAILURE RATE
              </span>
              <strong>82%</strong>
            </div>
            <div className="kpi-icon">
              ▲
            </div>
            <small>
              Application Service
            </small>
          </article>

          <article className="kpi-card green">
            <div>
              <span>
                DEPLOYMENT SIGNAL
              </span>
              <strong>+78%</strong>
            </div>
            <div className="kpi-icon">
              ⌁
            </div>
            <small>
              Error increase detected
            </small>
          </article>
        </section>

        <section className="dashboard-grid">
          <FailureChart
            incident={incident}
          />

          <ErrorDistribution />

          <RequestActivity />

          <DeploymentImpact
            incident={incident}
          />

          <article className="panel ai-panel">
            <div className="panel-header">
              <div>
                <span>
                  SERVICE HEALTH
                </span>
                <h2>
                  Monitored Services
                </h2>
              </div>

              <div className="ai-online">
                <i></i>
                LIVE
              </div>
            </div>

            <div className="evidence-section">
              <div className="evidence-item">
                <span>✓</span>
                <p>
                  Careers API — Healthy
                </p>
              </div>

              <div className="evidence-item">
                <span>✓</span>
                <p>
                  Jobs API — Healthy
                </p>
              </div>

              <div className="evidence-item">
                <span>!</span>
                <p>
                  Application Service —
                  82% failure rate
                </p>
              </div>

              <div className="evidence-item">
                <span>!</span>
                <p>
                  Profile Service —
                  authentication errors
                </p>
              </div>
            </div>
          </article>

          <article className="panel code-panel">
            <div className="panel-header">
              <div>
                <span>
                  ANALYTICS SUMMARY
                </span>
                <h2>
                  Current Signal
                </h2>
              </div>
            </div>

            <div className="code-window">
              <div className="code-row">
                <span>
                  PRIMARY ERROR
                </span>
                <strong>
                  DATABASE_CONNECTION_TIMEOUT
                </strong>
              </div>

              <div className="code-row">
                <span>
                  ERROR SHARE
                </span>
                <strong>79%</strong>
              </div>

              <div className="code-row">
                <span>
                  CORRELATED DEPLOYMENT
                </span>
                <strong>v1.4.8</strong>
              </div>

              <div className="code-row">
                <span>
                  CURRENT STATE
                </span>
                <strong>
                  DEGRADED
                </strong>
              </div>
            </div>
          </article>
        </section>
      </main>
    )
  }

  function AIInvestigatorView() {
    return (
      <main className="dashboard">
        <section className="filter-row">
          <div className="filter-title">
            <span>
              INVESTIGATION TARGET
            </span>
          </div>

          {incidents.map((item) => (
            <button
              key={item.id}
              type="button"
              className="filter"
              onClick={() =>
                setSelectedId(item.id)
              }
            >
              <span>{item.id}</span>
              <strong>
                {item.endpoint}
              </strong>
            </button>
          ))}

          <div className="filter">
            <span>ENGINE</span>
            <strong>
              RootWatch AI
            </strong>
          </div>

          <div className="filter">
            <span>STATUS</span>
            <strong>Ready</strong>
          </div>
        </section>

        <section className="kpi-grid">
          <article className="kpi-card purple">
            <div>
              <span>
                AI CONFIDENCE
              </span>
              <strong>
                {incident.confidence}%
              </strong>
            </div>
            <div className="kpi-icon">
              ✦
            </div>
            <small>
              Evidence correlation
            </small>
          </article>

          <article className="kpi-card red">
            <div>
              <span>
                FAILURE RATE
              </span>
              <strong>
                {incident.failureRate}%
              </strong>
            </div>
            <div className="kpi-icon">
              ▲
            </div>
            <small>
              {incident.endpoint}
            </small>
          </article>

          <article className="kpi-card cyan">
            <div>
              <span>
                EVIDENCE ITEMS
              </span>
              <strong>
                {incident.evidence.length}
              </strong>
            </div>
            <div className="kpi-icon">
              ✓
            </div>
            <small>
              Grounded signals
            </small>
          </article>

          <article className="kpi-card blue">
            <div>
              <span>
                DEPLOYMENT
              </span>
              <strong>
                {incident.deployment}
              </strong>
            </div>
            <div className="kpi-icon">
              ↗
            </div>
            <small>
              Correlated release
            </small>
          </article>

          <article className="kpi-card green">
            <div>
              <span>
                ENGINE STATUS
              </span>
              <strong>READY</strong>
            </div>
            <div className="kpi-icon">
              ●
            </div>
            <small>
              Investigation available
            </small>
          </article>
        </section>

        <section className="dashboard-grid">
          <IncidentSelector
            incident={incident}
            setSelectedId={setSelectedId}
          />

          <EvidencePanel
            incident={incident}
          />

          <CodePanel
            incident={incident}
          />
        </section>

        <InvestigatorChat />
      </main>
    )
  }

  function CodeTraceView() {
    return (
      <main className="dashboard">
        <section className="filter-row">
          <div className="filter-title">
            <span>
              SOURCE INVESTIGATION
            </span>
          </div>

          <div className="filter">
            <span>INCIDENT</span>
            <strong>{incident.id}</strong>
          </div>

          <div className="filter">
            <span>SERVICE</span>
            <strong>
              {incident.service}
            </strong>
          </div>

          <div className="filter">
            <span>DEPLOYMENT</span>
            <strong>
              {incident.deployment}
            </strong>
          </div>

          <div className="filter">
            <span>MATCH</span>
            <strong>High</strong>
          </div>
        </section>

        <section className="kpi-grid">
          <article className="kpi-card blue">
            <div>
              <span>
                SUSPECTED FILES
              </span>
              <strong>02</strong>
            </div>
            <div className="kpi-icon">
              ⌘
            </div>
            <small>
              Deployment changed files
            </small>
          </article>

          <article className="kpi-card purple">
            <div>
              <span>
                PRIMARY LINE
              </span>
              <strong>
                {incident.line}
              </strong>
            </div>
            <div className="kpi-icon">
              #
            </div>
            <small>
              Highest match
            </small>
          </article>

          <article className="kpi-card cyan">
            <div>
              <span>
                CODE CONFIDENCE
              </span>
              <strong>
                {incident.confidence}%
              </strong>
            </div>
            <div className="kpi-icon">
              ✓
            </div>
            <small>
              Evidence-backed match
            </small>
          </article>

          <article className="kpi-card red">
            <div>
              <span>
                FAILURES
              </span>
              <strong>
                {incident.failures}
              </strong>
            </div>
            <div className="kpi-icon">
              !
            </div>
            <small>
              Related requests
            </small>
          </article>

          <article className="kpi-card green">
            <div>
              <span>
                TRACE STATUS
              </span>
              <strong>
                FOUND
              </strong>
            </div>
            <div className="kpi-icon">
              ●
            </div>
            <small>
              Source location identified
            </small>
          </article>
        </section>

        <section className="dashboard-grid">
          <IncidentSelector
            incident={incident}
            setSelectedId={setSelectedId}
          />

          <article className="panel trend-panel">
            <div className="panel-header">
              <div>
                <span>
                  SOURCE CODE
                </span>
                <h2>
                  {incident.file}
                </h2>
              </div>

              <div className="code-confidence">
                HIGH MATCH
              </div>
            </div>

            <div className="code-window">
              <div className="code-window-header">
                <div>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>

                <span>
                  {incident.functionName}
                </span>
              </div>

              <div className="code-preview">
                <span>20</span>
                <code>
                  def submit_application(data):
                </code>

                <span>21</span>
                <code>
                  connection = get_connection()
                </code>

                <span>22</span>
                <code>
                  validate_request(data)
                </code>

                <span>23</span>
                <code>
                  cursor = connection.cursor()
                </code>

                <span className="highlight-line">
                  {incident.line}
                </span>

                <code className="highlight-code">
                  process_application(connection)
                </code>

                <span>25</span>
                <code>
                  return result
                </code>

                <span>26</span>
                <code>
                  connection.close()
                </code>
              </div>
            </div>

            <div className="trend-footer">
              <div>
                <span>FILE</span>
                <strong>
                  application_service.py
                </strong>
              </div>

              <div>
                <span>FUNCTION</span>
                <strong>
                  {incident.functionName}
                </strong>
              </div>

              <div>
                <span>LINE</span>
                <strong>
                  {incident.line}
                </strong>
              </div>

              <div>
                <span>MATCH</span>
                <strong className="degraded">
                  HIGH
                </strong>
              </div>
            </div>
          </article>

          <EvidencePanel
            incident={incident}
          />

          <article className="panel ai-panel">
            <div className="panel-header">
              <div>
                <span>
                  CHANGE ANALYSIS
                </span>
                <h2>
                  Deployment Evidence
                </h2>
              </div>

              <strong className="version-number">
                {incident.deployment}
              </strong>
            </div>

            <div className="evidence-section">
              <div className="evidence-item">
                <span>✓</span>
                <p>
                  {incident.file} changed
                  in deployment{' '}
                  {incident.deployment}
                </p>
              </div>

              <div className="evidence-item">
                <span>✓</span>
                <p>
                  Failures started after
                  the deployment
                </p>
              </div>

              <div className="evidence-item">
                <span>✓</span>
                <p>
                  Error pattern matches
                  the selected service
                </p>
              </div>

              <div className="evidence-item">
                <span>✓</span>
                <p>
                  RootWatch identified{' '}
                  {incident.functionName}{' '}
                  as the strongest code
                  location
                </p>
              </div>
            </div>
          </article>

          <DeploymentImpact
            incident={incident}
          />
        </section>
      </main>
    )
  }

  function renderView() {
    switch (activeView) {
      case 'Incidents':
        return <IncidentsView />

      case 'Analytics':
        return <AnalyticsView />

      case 'AI Investigator':
        return <AIInvestigatorView />

      case 'Code Trace':
        return <CodeTraceView />

      default:
        return <DashboardView />
    }
  }

  return (
    <div className="rootwatch">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-box">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div>
            <strong>ROOTWATCH</strong>
            <small>
              INCIDENT INTELLIGENCE
            </small>
          </div>
        </div>

        <nav>
          {navItems.map((item) => (
            <button
              key={item}
              className={
                activeView === item
                  ? 'nav-active'
                  : ''
              }
              onClick={() =>
                setActiveView(item)
              }
              type="button"
            >
              <span className="nav-icon">
                {item === 'Dashboard' &&
                  '◫'}
                {item === 'Incidents' &&
                  '⚠'}
                {item === 'Analytics' &&
                  '⌁'}
                {item ===
                  'AI Investigator' &&
                  '✦'}
                {item === 'Code Trace' &&
                  '⌘'}
              </span>

              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="platform-health">
            <span className="health-dot"></span>

            <div>
              <strong>
                System Healthy
              </strong>
              <small>
                All services online
              </small>
            </div>
          </div>

          <div className="version">
            ROOTWATCH v1.0
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="page-label">
              INCIDENT OPERATIONS CENTER
            </span>

            <h1>{activeView}</h1>
          </div>

          <div className="topbar-actions">
            <div className="live-status">
              <span></span>
              LIVE MONITORING
            </div>

            <div className="environment">
              PRODUCTION
            </div>

            <div className="clock">
              <strong>LIVE</strong>
              <small>
                UTC TELEMETRY
              </small>
            </div>
          </div>
        </header>

        {renderView()}
      </div>
    </div>
  )
}

export default App