import { createContext, useState, ReactNode, useEffect, useRef } from 'react'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const MenuItemContext = createContext<MenuItemContextType | undefined>(undefined)

// Provider component for the context
export function MenuItemProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MenuItemOptions>('files')
  const lastItem = useRef<MenuItemOptions>(item)
  const { setItems } = useEncryptedItems()
  const { modal } = useApp()

  useEffect(() => {
    // Save the last selected item
    lastItem.current = item

    // Reset items when the menu items change between 'files' and 'folders'
    if (item === 'settings') {
      modal.confirm({
        title: '¿Estás seguro de que quieres salir de la configuración?',
        content: 'No podrás volver a la configuración sin reiniciar la aplicación.'
      })
      return
    }

    setItems(undefined)
  }, [item, setItems, modal])

  return <MenuItemContext.Provider value={{ item, setItem }}>{children}</MenuItemContext.Provider>
}

export default MenuItemContext
