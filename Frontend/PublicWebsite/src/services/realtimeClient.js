import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/**
 * Guest STOMP connection, authenticated by table token (no JWT — guests have no
 * account). One client per table session; call disconnect() when the guest leaves
 * the page. Mirrors the ManagementWebsite realtimeClient's registry pattern so
 * multiple subscribe() calls survive reconnects.
 */
export function createGuestClient(tableToken) {
  const registrations = new Set()
  let client = null

  function parseAndDeliver(message, onMessage) {
    try {
      onMessage(JSON.parse(message.body))
    } catch {
      onMessage(message.body)
    }
  }

  function resubscribeAll() {
    registrations.forEach((reg) => {
      reg.subscription = client.subscribe(reg.destination, (message) => parseAndDeliver(message, reg.onMessage))
    })
  }

  client = new Client({
    webSocketFactory: () => new SockJS('/ws-guest'),
    connectHeaders: { 'X-Table-Token': tableToken },
    reconnectDelay: 5000,
  })
  client.onConnect = resubscribeAll
  client.activate()

  function subscribe(destination, onMessage) {
    const reg = { destination, onMessage, subscription: null }
    registrations.add(reg)

    if (client.connected) {
      reg.subscription = client.subscribe(destination, (message) => parseAndDeliver(message, onMessage))
    }

    return () => {
      registrations.delete(reg)
      if (reg.subscription && client.connected) {
        reg.subscription.unsubscribe()
      }
    }
  }

  function disconnect() {
    registrations.clear()
    client.deactivate()
  }

  return { subscribe, disconnect }
}
