import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getAccessToken } from './tokenStorage'

interface Registration {
  destination: string
  onMessage: (body: unknown) => void
  subscription: StompSubscription | null
}

let client: Client | null = null
const registrations = new Set<Registration>()

function parseAndDeliver(message: IMessage, onMessage: (body: unknown) => void) {
  try {
    onMessage(JSON.parse(message.body))
  } catch {
    onMessage(message.body)
  }
}

function resubscribeAll() {
  if (!client) return
  registrations.forEach((reg) => {
    reg.subscription = client!.subscribe(reg.destination, (message) => parseAndDeliver(message, reg.onMessage))
  })
}

function ensureClient(): Client {
  if (client) return client

  client = new Client({
    webSocketFactory: () => new SockJS('/ws'),
    connectHeaders: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    },
    reconnectDelay: 5000,
  })
  // Fires on the initial connect AND every reconnect — re-subscribing everyone
  // still registered is what makes the backstop (polling) unnecessary in practice
  // and keeps live topics working after a backend restart mid-session.
  client.onConnect = resubscribeAll
  client.activate()
  return client
}

export function subscribeRealtime(destination: string, onMessage: (body: unknown) => void): () => void {
  const stomp = ensureClient()
  const reg: Registration = { destination, onMessage, subscription: null }
  registrations.add(reg)

  if (stomp.connected) {
    reg.subscription = stomp.subscribe(destination, (message) => parseAndDeliver(message, onMessage))
  }

  return () => {
    registrations.delete(reg)
    if (reg.subscription && stomp.connected) {
      reg.subscription.unsubscribe()
    }
  }
}
