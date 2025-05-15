import Register from '@renderer/components/Auth/Register'
import { HookAPI } from 'antd/es/modal/useModal'
import { Icon } from '@iconify/react'
import Login from '../Login'

interface ShowAuthModalProps {
  onSubmit: (props: Record<string, unknown>) => void
  type: 'login' | 'register'
  modal: HookAPI
}

/**
 * @description `[ENG]` Show the authentication modal for login or register
 * @description `[ESP]` Muestra el modal de autenticación para iniciar sesión o registrarse
 * @param props - Props for the modal
 */
function showAuthModal(props: ShowAuthModalProps) {
  const { modal, onSubmit, type } = props

  return modal.info({
    title: `${type === 'login' ? 'Ingrese' : 'Registre'} su contraseña`,
    icon: <Icon icon="fluent-color:lock-shield-16" className="w-5 h-5 mt-1! mr-1.5!" />,
    content:
      type === 'login' ? <Login handleClose={onSubmit} /> : <Register handleClose={onSubmit} />,
    closable: false,
    keyboard: false,
    centered: true,
    footer: null
  })
}

export default showAuthModal
