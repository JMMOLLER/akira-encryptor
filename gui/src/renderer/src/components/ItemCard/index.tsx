import useItemCardActions from '@renderer/hooks/useItemCardActions'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import ItemCardDescription from './ItemCardDescription'
import ItemCardAvatar from './ItemCardAvatar'
import { Card } from 'antd'

interface ItemCardProps {
  item: StorageItemType
}

const ItemCard = ({ item }: ItemCardProps) => {
  const password = useUserConfig().userConfig.password!
  const actions = useItemCardActions({ item, password })

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
