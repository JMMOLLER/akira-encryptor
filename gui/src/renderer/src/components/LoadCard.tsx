import cardActions from '@renderer/constants/cardActions'
import { StorageItem } from '../../../../../types'
import formatBytes from '@utils/formatBytes'
import { Avatar, Card, Tooltip } from 'antd'

interface LoadCardProps {
  encryptedItem: StorageItem
}

const LoadCard = ({ encryptedItem }: LoadCardProps) => {
  const renderActions = () =>
    cardActions.map(({ Icon, key, title, onclick }) => (
      <Tooltip title={title} key={key}>
        <Icon onClick={onclick} />
      </Tooltip>
    ))

  const renderDescription = () => (
    <ul>
      <li className="truncate">
        <span className="font-semibold">Nombre:</span>{' '}
        {encryptedItem.originalName && encryptedItem.originalName.length > 28 ? (
          <Tooltip title={encryptedItem.originalName}>
            <span>{encryptedItem.originalName}</span>
          </Tooltip>
        ) : (
          <span>{encryptedItem.originalName}</span>
        )}
      </li>
      <li>
        <span className="font-semibold">Tamaño:</span> {formatBytes(encryptedItem.size || 0)}
      </li>
    </ul>
  )

  return (
    <Card className="w-[350px] h-min" actions={renderActions()}>
      <Card.Meta
        avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />}
        title={encryptedItem.type === 'file' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={renderDescription()}
      />
    </Card>
  )
}

export default LoadCard
