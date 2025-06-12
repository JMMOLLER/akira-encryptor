import useItemCardActions from '@renderer/hooks/useItemCardActions'
import ItemCardDescription from './ItemCardDescription'
import ItemCardAvatar from './ItemCardAvatar'
import { Card } from 'antd'

interface ItemCardProps {
  item: StorageItem
}

const ItemCard = ({ item }: ItemCardProps) => {
  const actions = useItemCardActions({ item })

  return (
    <Card className="w-[350px] h-min" actions={actions}>
      <Card.Meta
        title={item.type === 'file' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={<ItemCardDescription item={item} />}
        avatar={<ItemCardAvatar item={item} />}
      />
    </Card>
  )
}

export default ItemCard
