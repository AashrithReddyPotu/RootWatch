import { useState } from 'react'
import './App.css'

type Incident = {
  id: string
  endpoint: string
  severity: 'HIGH' | 'MEDIUM'
  error: string
  failures: number
  totalRequests: number
  deployment: string
  confidence: number
  summary: string
  evidence: string[]
  code: {
    file: string
    functionName: string
    line: number
  }
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
    totalRequests: 57,
    deployment: 'v1.4.8',
    confidence: 88,
    summary:
      'The evidence suggests a database connection issue affecting the application submission service. Failures began shortly after deployment v1.4.8.',
    evidence: [
      '47 of 57 requests failed',
      'DATABASE_CONNECTION_TIMEOUT dominates errors',
      'Failures started after deployment v1.4.8',
      'application_service.py changed',
    ],
    code: {
      file: 'services/application_service.py',
      functionName: 'submit_application()',
      line: 24,
    },
  },
  {
    id: 'INC-002',
    endpoint: '/api/profile',
    severity: 'MEDIUM',
    error: 'AUTH_TOKEN_ERROR',
    failures: 12,
    totalRequests: 48,
    deployment: 'v1.4.7',
    confidence: 76,
    summary:
      'The evidence suggests authentication token validation failures affecting the profile endpoint. The issue appears concentrated around token verification.',
    evidence: [
      '12 of 48 profile requests failed',
      'AUTH_TOKEN_ERROR dominates recent profile failures',
      'Failures are isolated to authenticated profile requests',
      'auth middleware is a likely investigation point',
    ],
    code: {
      file: 'services/auth_service.py',
      functionName: 'validate_token()',
      line: 41,
    },
  },
]

const initialMessages: Record<string, Message[]> = {
  'INC-001': [
    {
      sender: 'ai',
      text: incidents[0].summary,
    },
    {
      sender: 'user',
      text: 'Where should I look in the code?',
    },
    {
      sender: 'ai',
      text: 'Start with services/application_service.py. The submit_application() function may not guarantee database connection cleanup when an exception occurs.',
    },
  ],
  'INC-002': [
    {
      sender: 'ai',
      text: incidents[1].summary,
    },
  ],
}

function getMockResponse(incident: Incident, question: string): string {
  const query = question.toLowerCase()

  if (
    query.includes('where') ||
    query.includes('code') ||
    query.includes('file')
  ) {
    return `The strongest code location is ${incident.code.file}, specifically ${incident.code.functionName} near line ${incident.code.line}. I would investigate this area first.`
  }

  if (
    query.includes('why') ||
    query.includes('cause') ||
    query.includes('root')
  ) {
    if (incident.id === 'INC-001') {
      return 'The likely root cause is a database connection cleanup issue. Repeated DATABASE_CONNECTION_TIMEOUT failures began after deployment v1.4.8, and application_service.py was modified in that deployment.'
    }

    return 'The likely root cause is a token validation problem in the authentication path. AUTH_TOKEN_ERROR is the dominant failure type and the failures are concentrated on authenticated profile requests.'
  }

  if (
    query.includes('fix') ||
    query.includes('recommend') ||
    query.includes('solution')
  ) {
    if (incident.id === 'INC-001') {
      return 'Recommendation: inspect submit_application() and guarantee database connections are released in all success and exception paths. A finally block or context-managed connection would be a good place to investigate.'
    }

    return 'Recommendation: inspect validate_token(), verify token expiration and signature handling, and review recent authentication configuration changes before redeploying.'
  }

  if (
    query.includes('deployment') ||
    query.includes('change') ||
    query.includes('version')
  ) {
    return `This incident is associated with deployment ${incident.deployment}. The timing of the failures and the changed code make that deployment relevant evidence, although it does not by itself prove causation.`
  }

  if (
    query.includes('confidence') ||
    query.includes('sure')
  ) {
    return `Current investigation confidence is ${incident.confidence}%. This is based on the failure pattern, error frequency, deployment context, and likely code location.`
  }

  return `${incident.summary} The strongest current code lead is ${incident.code.file} in ${incident.code.functionName}.`
}

function App() {
  const [selectedId, setSelectedId] = useState('INC-001')
  const [messages, setMessages] =
    useState<Record<string, Message[]>>(initialMessages)
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const selectedIncident =
    incidents.find((incident) => incident.id === selectedId) ?? incidents[0]

  const currentMessages = messages[selectedIncident.id] ?? []

  const totalFailures = incidents.reduce(
    (total, incident) => total + incident.failures,
    0,
  )

  const criticalFailureRate = Math.round(
    (incidents[0].failures / incidents[0].totalRequests) * 100,
  )

  const selectIncident = (id: string) => {
    setSelectedId(id)
    setQuestion('')
  }

  const sendMessage = () => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isThinking) {
      return
    }

    const incidentId = selectedIncident.id

    const userMessage: Message = {
      sender: 'user',
      text: trimmedQuestion,
    }

    setMessages((previous) => ({
      ...previous,
      [incidentId]: [...(previous[incidentId] ?? []), userMessage],
    }))

    setQuestion('')
    setIsThinking(true)

    window.setTimeout(() => {
      const aiMessage: Message = {
        sender: 'ai',
        text: getMockResponse(selectedIncident, trimmedQuestion),
      }

      setMessages((previous) => ({
        ...previous,
        [incidentId]: [...(previous[incidentId] ?? []), aiMessage],
      }))

      setIsThinking(false)
    }, 650)
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>RootWatch</h1>
          <p>AI-Powered Incident Investigation</p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          System Monitoring
        </div>
      </header>

      <main>
        <section className="stats">
          <div className="stat-card">
            <span>Active Incidents</span>
            <strong>{incidents.length}</strong>
          </div>

          <div className="stat-card">
            <span>Total Failures</span>
            <strong>{totalFailures}</strong>
          </div>

          <div className="stat-card">
            <span>Affected Services</span>
            <strong>{incidents.length}</strong>
          </div>

          <div className="stat-card">
            <span>Critical Failure Rate</span>
            <strong>{criticalFailureRate}%</strong>
          </div>
        </section>

        <section className="workspace">
          <aside className="panel incidents">
            <h2>Active Incidents</h2>

            {incidents.map((incident) => (
              <div
                key={incident.id}
                className={`incident ${
                  selectedIncident.id === incident.id ? 'selected' : ''
                }`}
                onClick={() => selectIncident(incident.id)}
              >
                <div className="incident-top">
                  <strong>{incident.id}</strong>

                  <span
                    className={`badge ${incident.severity.toLowerCase()}`}
                  >
                    {incident.severity}
                  </span>
                </div>

                <h3>{incident.endpoint}</h3>
                <p>{incident.error}</p>
                <span>{incident.failures} failures</span>
              </div>
            ))}
          </aside>

          <section className="panel investigation">
            <div className="incident-header">
              <div>
                <span className="eyebrow">{selectedIncident.id}</span>
                <h2>{selectedIncident.endpoint}</h2>
              </div>

              <span
                className={`badge ${selectedIncident.severity.toLowerCase()}`}
              >
                {selectedIncident.severity}
              </span>
            </div>

            <div className="incident-metrics">
              <div>
                <span>Error</span>
                <strong>{selectedIncident.error}</strong>
              </div>

              <div>
                <span>Failures</span>
                <strong>
                  {selectedIncident.failures} / {selectedIncident.totalRequests}
                </strong>
              </div>

              <div>
                <span>Deployment</span>
                <strong>{selectedIncident.deployment}</strong>
              </div>
            </div>

            <h2 className="section-title">AI Investigation</h2>

            <div className="chat">
              {currentMessages.map((message, index) => (
                <div
                  className={`message ${
                    message.sender === 'ai' ? 'ai' : 'user'
                  }`}
                  key={`${selectedIncident.id}-${index}`}
                >
                  <span>
                    {message.sender === 'ai' ? 'ROOTWATCH AI' : 'YOU'}
                  </span>
                  <p>{message.text}</p>
                </div>
              ))}

              {isThinking && (
                <div className="message ai">
                  <span>ROOTWATCH AI</span>
                  <p>Analyzing incident evidence...</p>
                </div>
              )}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={question}
                placeholder="Ask RootWatch about this incident..."
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendMessage()
                  }
                }}
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={isThinking}
              >
                {isThinking ? 'Analyzing...' : 'Ask'}
              </button>
            </div>
          </section>

          <aside className="panel evidence">
            <h2>Evidence</h2>

            {selectedIncident.evidence.map((item, index) => (
              <div className="evidence-item" key={index}>
                <span className="check">✓</span>
                <p>{item}</p>
              </div>
            ))}

            <div className="confidence">
              <span>AI Confidence</span>
              <strong>{selectedIncident.confidence}%</strong>
            </div>

            <h2 className="code-title">Likely Code Location</h2>

            <div className="code-card">
              <span>FILE</span>
              <strong>{selectedIncident.code.file}</strong>

              <span>FUNCTION</span>
              <strong>{selectedIncident.code.functionName}</strong>

              <span>LINE</span>
              <strong>{selectedIncident.code.line}</strong>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App