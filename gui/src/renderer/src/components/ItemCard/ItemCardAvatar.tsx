import * as Icons from '@ant-design/icons'

const ItemCardAvatar = ({ item }: { item: StorageItemType }) => {
  const className = 'w-8 h-8 text-5xl'

  if (item.type === 'folder') {
    return <Icons.FolderOpenOutlined className={className} />
  }

  const ext = item.originalName?.split('.').pop()?.toLowerCase()
  const extGroups = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    audio: ['mp3', 'wav', 'aac', 'flac', 'ogg'],
    video: ['mp4', 'mkv', 'avi', 'mov', 'wmv']
  }

  if (extGroups.image.includes(ext!)) return <Icons.FileImageOutlined className={className} />
  if (extGroups.audio.includes(ext!)) return <Icons.CustomerServiceOutlined className={className} />
  if (extGroups.video.includes(ext!)) return <Icons.PlaySquareOutlined className={className} />

  return <Icons.FileUnknownOutlined className={className} />
}

export default ItemCardAvatar
