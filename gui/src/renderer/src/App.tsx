import MainContent from './components/MainContent'
import Navbar from './components/Navbar'
import { Layout } from 'antd'

function App() {
  const handleContextMenu = (event: React.MouseEvent) => {
    if (event.ctrlKey) {
      event.preventDefault()
      console.log('Ctrl + Right Click detected, opening DevTools...')
      window.api.openDevTools()
    }
  }

  return (
    <Layout className="!min-h-screen" onContextMenu={handleContextMenu}>
      <Navbar />
      <MainContent />
    </Layout>
  )
}

export default App
