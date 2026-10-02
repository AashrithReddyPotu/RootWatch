import './App.css'

function App() {
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
            <strong>2</strong>
          </div>

          <div className="stat-card">
            <span>Total Failures</span>
            <strong>59</strong>
          </div>

          <div className="stat-card">
            <span>Affected Services</span>
            <strong>2</strong>
          </div>

          <div className="stat-card">
            <span>Critical Failure Rate</span>
            <strong>82%</strong>
          </div>
        </section>

        <section className="workspace">
          {/* LEFT PANEL */}
          <aside className="panel incidents">
            <h2>Active Incidents</h2>

            <div className="incident selected">
              <div className="incident-top">
                <strong>INC-001</strong>
                <span className="badge high">HIGH</span>
              </div>

              <h3>/api/applications</h3>
              <p>DATABASE_CONNECTION_TIMEOUT</p>
              <span>47 failures</span>
            </div>

            <div className="incident">
              <div className="incident-top">
                <strong>INC-002</strong>
                <span className="badge medium">MEDIUM</span>
              </div>

              <h3>/api/profile</h3>
              <p>AUTH_TOKEN_ERROR</p>
              <span>12 failures</span>
            </div>
          </aside>

          {/* CENTER PANEL */}
          <section className="panel investigation">
            <div className="incident-header">
              <div>
                <span className="eyebrow">INC-001</span>
                <h2>/api/applications</h2>
              </div>

              <span className="badge high">HIGH</span>
            </div>

            <div className="incident-metrics">
              <div>
                <span>Error</span>
                <strong>DATABASE_CONNECTION_TIMEOUT</strong>
              </div>

              <div>
                <span>Failures</span>
                <strong>47 / 57</strong>
              </div>

              <div>
                <span>Deployment</span>
                <strong>v1.4.8</strong>
              </div>
            </div>

            <h2 className="section-title">AI Investigation</h2>

            <div className="chat">
              <div className="message ai">
                <span>ROOTWATCH AI</span>
                <p>
                  The evidence suggests a database connection issue affecting
                  the application submission service. Failures began shortly
                  after deployment v1.4.8.
                </p>
              </div>

              <div className="message user">
                <span>YOU</span>
                <p>Where should I look in the code?</p>
              </div>

              <div className="message ai">
                <span>ROOTWATCH AI</span>
                <p>
                  Start with services/application_service.py. The
                  submit_application() function may not guarantee database
                  connection cleanup when an exception occurs.
                </p>
              </div>
            </div>

            <div className="chat-input">
              <input
                type="text"
                placeholder="Ask RootWatch about this incident..."
              />
              <button type="button">Ask</button>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside className="panel evidence">
            <h2>Evidence</h2>

            <div className="evidence-item">
              <span className="check">✓</span>
              <p>
                <strong>47 of 57</strong> requests failed
              </p>
            </div>

            <div className="evidence-item">
              <span className="check">✓</span>
              <p>DATABASE_CONNECTION_TIMEOUT dominates errors</p>
            </div>

            <div className="evidence-item">
              <span className="check">✓</span>
              <p>
                Failures started after deployment <strong>v1.4.8</strong>
              </p>
            </div>

            <div className="evidence-item">
              <span className="check">✓</span>
              <p>application_service.py changed</p>
            </div>

            <div className="confidence">
              <span>AI Confidence</span>
              <strong>88%</strong>
            </div>

            <h2 className="code-title">Likely Code Location</h2>

            <div className="code-card">
              <span>FILE</span>
              <strong>services/application_service.py</strong>

              <span>FUNCTION</span>
              <strong>submit_application()</strong>

              <span>LINE</span>
              <strong>24</strong>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App