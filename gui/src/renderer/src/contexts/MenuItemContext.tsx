import { createContext, useState, ReactNode } from 'react'

// Initialize the type for the context
const MenuItemContext = createContext<MenuItemContextType | undefined>(undefined)

// Provider component for the context
export function MenuItemProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MenuItemOptions>('files')

  return <MenuItemContext.Provider value={{ item, setItem }}>{children}</MenuItemContext.Provider>
}

export default MenuItemContext
