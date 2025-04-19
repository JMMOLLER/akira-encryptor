import cardActions from '@renderer/constants/cardActions'
import { Skeleton } from 'antd'

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton
        className="w-[350px]! h-min! bg-white p-6 rounded-t-lg"
        paragraph={{ rows: 1 }}
        avatar
        active
      />
      <ul className="inline-flex justify-between rounded-b-lg bg-white w-full text-black/25 divide-x divide-gray-300/35">
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
