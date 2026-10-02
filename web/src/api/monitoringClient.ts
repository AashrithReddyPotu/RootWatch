import type { Incident, InvestigationContext } from '../types/api'

const MONITORING_API =
  import.meta.env.VITE_MONITORING_API || 'http://localhost:8000'

export async function getIncidents(): Promise<Incident[]> {
  const response = await fetch(`${MONITORING_API}/incidents`)

  if (!response.ok) {
    throw new Error(`Monitoring API error: ${response.status}`)
  }

  return response.json()
}

export async function getIncident(
  incidentId: string,
): Promise<Incident> {
  const response = await fetch(
    `${MONITORING_API}/incidents/${incidentId}`,
  )

  if (!response.ok) {
    throw new Error(`Monitoring API error: ${response.status}`)
  }

  return response.json()
}

export async function getInvestigationContext(
  incidentId: string,
): Promise<InvestigationContext> {
  const response = await fetch(
    `${MONITORING_API}/investigation/context/${incidentId}`,
  )

  if (!response.ok) {
    throw new Error(`Monitoring API error: ${response.status}`)
  }

  return response.json()
}