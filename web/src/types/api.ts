export type Severity = 'high' | 'medium'

export interface Incident {
  incident_id: string
  service: string
  endpoint: string
  method: string
  severity: Severity
  status: 'active' | 'resolved'
  error_type: string
  occurrence_count: number
  failure_rate: number
  start_time: string
  last_seen: string
  deployment_version: string
}

export interface Deployment {
  deployment_version: string
  files_changed: string[]
  deployed_at: string
  commit_hash: string
  description: string
}

export interface ServerLog {
  id: string
  timestamp: string
  service: string
  endpoint: string
  method: string
  status_code: number
  latency_ms: number
  error_type: string | null
  error_message: string | null
  deployment_version: string
  request_id: string
}

export interface Statistics {
  window_start: string
  window_end: string
  total_requests: number
  failed_requests: number
  failure_rate: number
  average_latency_ms: number
  error_counts: Record<string, number>
}

export interface InvestigationContext {
  incident: Incident
  recent_logs: ServerLog[]
  deployment: Deployment | null
  statistics: Statistics
}

export interface Evidence {
  id: string
  label: string
  source: string
}

export interface Claim {
  type: 'fact' | 'inference' | 'recommendation'
  text: string
  evidence_ids: string[]
}

export interface CodeLocation {
  path: string
  function?: string
  line?: number
  reason: string
  snippet?: string
}

export interface ChatRequest {
  incident_id: string
  message: string
}

export interface ChatResponse {
  incident_id: string
  intent: string
  answer: string
  claims: Claim[]
  evidence: Evidence[]
  code_locations: CodeLocation[]
  confidence: number
  model_used: string | null
}
