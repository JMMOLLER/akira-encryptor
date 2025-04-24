import UserConfigContext from '@renderer/contexts/UserConfig'
import { useContext } from 'react'

export function useUserConfig() {
  const context = useContext(UserConfigContext)
  if (!context) {
    throw new Error('useUserConfig debe usarse dentro de un <UserConfigProvider>')
  }
  return context
}
