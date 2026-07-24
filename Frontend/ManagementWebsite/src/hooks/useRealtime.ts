import { useEffect, useRef } from 'react'
import { subscribeRealtime } from '../services/realtimeClient'

/**
 * Subscribes to a STOMP topic for the lifetime of the component; unsubscribes on unmount.
 * Re-subscribes whenever `destination` changes (e.g. a per-id topic built from currently
 * selected state) — an empty/falsy destination is a no-op, so callers can pass a topic built
 * from an id that may not be selected yet without needing to conditionally call the hook.
 */
export function useRealtime(destination: string, onMessage: (body: unknown) => void) {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    if (!destination) return
    const unsubscribe = subscribeRealtime(destination, (body) => handlerRef.current(body))
    return unsubscribe
  }, [destination])
}
