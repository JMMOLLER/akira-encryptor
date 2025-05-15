import Register from '@renderer/components/Auth/Register'
import { RiShieldCheckFill } from 'react-icons/ri'
import { HookAPI } from 'antd/es/modal/useModal'
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
    content:
      type === 'login' ? <Login handleClose={onSubmit} /> : <Register handleClose={onSubmit} />,
    closable: false,
    keyboard: false,
    centered: true,
    footer: null,
    icon: <RiShieldCheckFill className="mt-1! mr-1!" size={20} />
  })
}

export default showAuthModal
