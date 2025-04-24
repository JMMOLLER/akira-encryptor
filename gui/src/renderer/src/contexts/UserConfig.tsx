import { createContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react'
import showAuthModal from '@renderer/components/Auth/modals/showAuthModal'
import { Conf } from 'electron-conf/renderer'
import useApp from 'antd/es/app/useApp'
import bcrypt from 'bcryptjs'

const conf = new Conf<ConfStoreType>()
const userConf = await conf.get('userConfig')
// conf.set('userConfig', {})
// console.log('User config:', userConf)

// Initialize the type for the context
const UserConfigContext = createContext<UserConfigContext | undefined>(undefined)

// Provider component for the context
export function UserConfigProvider({ children }: { children: ReactNode }) {
  const [userConfig, setUserConfig] = useState<UserConfig>(userConf as UserConfig)
  const prevModal = useRef<PrevModalType>(null)
  const [isLoggedIn, setLogin] = useState(false)
  const { modal, message } = useApp()

  /**
   * @description `[ENG]` Function to update the user configuration in the store and state. The password property is excluded from store.
   * @description `[ESP]` Función para actualizar la configuración del usuario en el almacén y el estado. La propiedad de contraseña se excluye del almacén.
   * @param newConfig - The new configuration to be merged with the existing one.
   */
  const updateUserConfig = useCallback(
    (newConfig: Partial<UserConfig>) => {
      // Merge the new config with the existing one
      const mergedConfig = { ...userConfig, ...newConfig }
      delete mergedConfig.password

      // Save the new config to the store
      console.log('Updating user config', mergedConfig)
      conf.set('userConfig', mergedConfig)

      // Update the state
      setUserConfig((prev) => ({
        ...prev,
        ...newConfig
      }))
    },
    [userConfig]
  )

  // Check if the user is registered
  useEffect(() => {
    if (userConfig.hashedPassword) return
    else if (prevModal.current) {
      prevModal.current.destroy()
      prevModal.current = null
    }

    // Show the registration modal and save the ref
    prevModal.current = showAuthModal({
      type: 'register',
      modal,
      onSubmit: ({ password }) => {
        if (!password || typeof password !== 'string') {
          message.error('Se generó un error al registrar la contraseña')
          return
        }
        updateUserConfig({ hashedPassword: bcrypt.hashSync(password, 10), password })
        setLogin(true)
        prevModal.current?.destroy()
      }
    })
  }, [userConfig.hashedPassword, updateUserConfig, modal, message])

  // Check if the user is logged in
  useEffect(() => {
    if (!userConfig.hashedPassword || isLoggedIn) return
    else if (prevModal.current) {
      prevModal.current.destroy()
      prevModal.current = null
    }

    // Show the login modal and save the ref
    prevModal.current = showAuthModal({
      type: 'login',
      onSubmit: ({ password }) => {
        if (!password || typeof password !== 'string') {
          message.error('Se generó un error al validar su contraseña')
          return
        }
        const isValid = bcrypt.compareSync(password, userConfig.hashedPassword!)
        if (isValid) {
          setLogin(true)
          updateUserConfig({ password })
          prevModal.current?.destroy()
        } else {
          message.error('Contraseña incorrecta')
        }
      },
      modal
    })
  }, [isLoggedIn, userConfig.hashedPassword, updateUserConfig, modal, message])

  return (
    <UserConfigContext.Provider
      value={{ userConfig: { ...userConfig, isLoggedIn }, updateUserConfig }}
    >
      {children}
    </UserConfigContext.Provider>
  )
}

export default UserConfigContext
