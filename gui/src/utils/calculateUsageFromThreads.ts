import os from 'os'

/**
 * @description `[ESP]` - Calcula el porcentaje de uso de CPU a partir de un número de hilos.
 * @description `[ENG]` - Calculates the CPU usage percentage from a given number of threads.
 * @param threads - The number of CPU threads to use.
 * @returns number - The percentage of CPU usage (0-100).
 */
export default function calculateUsageFromThreads(threads: number): number {
  const totalThreads = os.cpus().length
  const percentage = Math.round((threads / totalThreads) * 100)
  return Math.min(100, Math.max(0, percentage))
}
