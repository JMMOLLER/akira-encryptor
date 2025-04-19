import MainContent from './components/MainContent'
import Navbar from './components/Navbar'
import { Layout } from 'antd'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <Layout className="!min-h-screen">
      <Navbar />
      <MainContent />
    </Layout>
  )
}

export default App
