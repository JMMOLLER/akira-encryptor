import { createContext, useState, ReactNode, useRef } from 'react'

// Initialize the type for the context
const MenuItemContext = createContext<MenuItemContextType | undefined>(undefined)

// Provider component for the context
export function MenuItemProvider({ children }: { children: ReactNode }) {
  const [menuItem, setMenuItem] = useState<MenuItemOptions>('files')
  const lastItem = useRef<MenuItemOptions>(menuItem)

  const changeMenuItem = (item?: MenuItemOptions) => {
    if (!item) return setMenuItem(lastItem.current)
    lastItem.current = menuItem
    setMenuItem(item)
  }

  return (
    <MenuItemContext.Provider value={{ menuItem, setMenuItem: changeMenuItem }}>
      {children}
    </MenuItemContext.Provider>
  )
}

export default MenuItemContext
