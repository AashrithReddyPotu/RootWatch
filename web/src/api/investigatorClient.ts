import type { ChatRequest, ChatResponse } from '../types/api'

const AI_API =
  import.meta.env.VITE_AI_API || 'http://localhost:8001/api/v1'

export async function sendChatMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  const response = await fetch(`${AI_API}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Investigator API error: ${response.status}`)
  }

  return response.json()
}
