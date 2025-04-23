import { useMenuItem } from '@renderer/hooks/useMenuItem'
import items from '@renderer/constants/menuItems'
import { MenuInfo } from 'rc-menu/lib/interface'
import Sider from 'antd/es/layout/Sider'
import { useState } from 'react'
import { Menu } from 'antd'

const defaultSelectedKey: MenuItemOptions[] = ['files']

// TODO: La idea es que al hacer click en conf se seleccione y cuando lo cierres regrese la seleccion al previo seleccionado, ahora mismo al seleccionar conf se queda seleccionado y no vuelve a la seleccion previa.

function Navbar() {
  const [collapsed, setCollapsed] = useState(false)
  const { menuItem, setMenuItem } = useMenuItem()

  const handleSelect = (item: MenuInfo) => {
    setMenuItem(item.key as MenuItemOptions)
  }

  return (
    <Sider
      className="backdrop-blur-md z-10"
      onClick={() => setCollapsed(!collapsed)}
      defaultCollapsed
      collapsible
    >
      <div className="demo-logo-vertical" />
      <Menu
        defaultSelectedKeys={defaultSelectedKey}
        onSelect={handleSelect}
        selectedKeys={[menuItem]}
        mode="inline"
        items={items}
      />
    </Sider>
  )
}

export default Navbar
