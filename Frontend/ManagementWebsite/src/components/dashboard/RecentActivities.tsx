import Card, { CardHeader, CardBody } from '../common/Card'
import { recentActivities, type Activity } from '../../data/mockData'

const SaleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)

const ImportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const ActivityRow = ({ a }: { a: Activity }) => (
  <li className="flex gap-3 items-start py-3 border-b border-line last:border-b-0">
    <span
      className={[
        'w-[3.2rem] h-[3.2rem] rounded-full flex items-center justify-center shrink-0',
        a.action === 'bán hàng' ? 'bg-primary-50 text-primary' : 'bg-success-50 text-success',
      ].join(' ')}
    >
      {a.action === 'bán hàng' ? <SaleIcon /> : <ImportIcon />}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-ink-subtle m-0 mb-1 leading-[1.5]">
        <span className="text-primary font-medium">{a.person}</span> vừa{' '}
        <span className="text-primary font-medium">{a.action}</span> với giá trị{' '}
        <strong className="text-ink font-semibold">{a.value.toLocaleString('vi-VN')}</strong> tại {a.branch}
      </p>
      <span className="text-xs text-ink-muted">{a.time}</span>
    </div>
  </li>
)

const RecentActivities = () => (
  <Card className="w-full">
    <CardHeader title="Hoạt động gần đây" />
    <CardBody className="flex-1" noPad>
      <ul className="list-none m-0 px-5 pt-0 pb-2 flex flex-col">
        {recentActivities.map(a => (
          <ActivityRow key={a.id} a={a} />
        ))}
      </ul>
    </CardBody>
  </Card>
)

export default RecentActivities
