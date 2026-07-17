import { useEffect, useRef } from 'react'
import { subscribeRealtime } from '../services/realtimeClient'

/** Subscribes to a STOMP topic for the lifetime of the component; unsubscribes on unmount. */
export function useRealtime(destination: string, onMessage: (body: unknown) => void) {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    const unsubscribe = subscribeRealtime(destination, (body) => handlerRef.current(body))
    return unsubscribe
  }, [destination])
}
