import cardActions from '@renderer/constants/cardActions'
import { Progress, Skeleton } from 'antd'

interface SkeletonCardProps {
  /**
   * @description `[ENG]` Encrypted item in progress that will be shown in the skeleton card.
   * @description `[ESP]` Elemento en proceso de encriptación que se mostrará en la tarjeta de esqueleto.
   */
  encryptedItem?: EncryptedItem
}

function SkeletonCard(props: SkeletonCardProps) {
  const { encryptedItem } = props

  return (
    <div className="skeleton-card relative w-fit">
      {encryptedItem && (
        <Progress
          className="absolute left-6 top-6 bg-white"
          percent={encryptedItem.percent}
          type="circle"
          status={encryptedItem.status === 'error' ? 'exception' : undefined}
          size={40}
        />
      )}
      <Skeleton
        className="w-[350px]! h-min! bg-white p-6 rounded-t-lg -mb-0.5!"
        paragraph={{ rows: 1 }}
        avatar
        active
      />
      <ul className="inline-flex justify-between rounded-b-lg bg-white w-full text-black/25 divide-x divide-gray-300/35 border-t border-gray-300/35 pb-0.5!">
        {cardActions.map((action, actionIndex) => (
          <li className="grow my-3! cursor-not-allowed *:justify-center *:w-full" key={actionIndex}>
            {action}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SkeletonCard
