export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Incident {
  incident_id: string
  endpoint: string
  severity: Severity
  error_type: string
  occurrence_count: number
  total_requests?: number
  failure_rate: number
  start_time?: string
  deployment_version?: string
}

export interface Deployment {
  version: string
  files_changed?: string[]
  deployed_at?: string
}

export interface InvestigationContext {
  incident: Incident
  recent_logs: unknown[]
  deployment: Deployment | null
  statistics: Record<string, unknown>
}

export interface Evidence {
  label: string
  type: 'fact' | 'inference' | 'recommendation'
}

export interface CodeLocation {
  path: string
  function?: string
  line?: number
}

export interface ChatRequest {
  incident_id: string
  message: string
}

export interface ChatResponse {
  answer: string
  evidence: Evidence[]
  code_locations: CodeLocation[]
  confidence: number
}