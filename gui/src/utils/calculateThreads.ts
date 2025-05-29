import os from 'os'

/**
 * @description `[ESP]` - Calcula el número de hilos de CPU a utilizar basado en un porcentaje.
 * @description `[ENG]` - Calculates the number of CPU threads to use based on a percentage.
 * @param percentage - The percentage of CPU threads to use (0-100).
 */
export default function calculateThreads(percentage: number): number {
  const totalThreads = os.cpus().length
  const threads = Math.max(1, Math.floor(totalThreads * (percentage / 100)))
  return threads
}
