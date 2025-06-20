import { useEffect, useRef, useState } from 'react'

export function useCountdown(size: number) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [active, setActive] = useState(false)
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (active && size > 0) {
      setCounter(size)
      timerRef.current = setInterval(() => {
        setCounter((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [active, size])

  return { setActive, counter }
}
