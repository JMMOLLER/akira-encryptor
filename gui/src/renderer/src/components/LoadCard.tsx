import cardActions from '@renderer/constants/cardActions'
import { Avatar, Card } from 'antd'

interface LoadCardProps {
  encryptedItem: EncryptedItem
}

function LoadCard(props: LoadCardProps) {
  const { encryptedItem } = props

  return (
    <Card className="w-[350px] h-min" actions={cardActions}>
      <Card.Meta
        avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />}
        title={encryptedItem.type === 'files' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={
          <ul>
            <li>
              <span className="font-semibold">Nombre:</span> archivo.txt
            </li>
            <li>
              <span className="font-semibold">Tamaño:</span> 2.5 MB
            </li>
          </ul>
        }
      />
    </Card>
  )
}

export default LoadCard
