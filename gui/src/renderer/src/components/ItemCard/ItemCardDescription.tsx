import { formatBytes } from '@akira-encryptor/core/utils'
import { Tooltip } from 'antd'

const ItemCardDescription = ({ item }: { item: StorageItem }) => (
  <ul>
    <li className="truncate">
      <span className="font-semibold">Nombre:</span>{' '}
      {item.originalName && item.originalName.length > 28 ? (
        <Tooltip title={item.originalName}>
          <span>{item.originalName}</span>
        </Tooltip>
      ) : (
        <span>{item.originalName}</span>
      )}
    </li>
    <li>
      <span className="font-semibold">Tamaño:</span> {formatBytes(item.size || 0)}
    </li>
  </ul>
)

export default ItemCardDescription
