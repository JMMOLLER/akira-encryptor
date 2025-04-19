import MainContent from './components/MainContent'
import Navbar from './components/Navbar'
import { Layout } from 'antd'

function App() {
  return (
    <Layout className="!min-h-screen">
      <Navbar />
      <MainContent />
    </Layout>
  )
}

export default App
