import './assets/main.css'

import { MenuItemProvider } from './contexts/MenuItemContext'
import { App as AntdApp, ConfigProvider } from 'antd'
import { createRoot } from 'react-dom/client'
import esES from 'antd/locale/es_ES'
import theme from './configs/theme'
import { StrictMode } from 'react'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={theme} locale={esES}>
      <AntdApp>
        <MenuItemProvider>
          <App />
        </MenuItemProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>
)
