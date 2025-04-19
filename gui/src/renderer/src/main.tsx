import './assets/main.css'

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
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>
)
