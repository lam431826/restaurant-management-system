import Card, { CardHeader, CardBody, CardFooter } from '../common/Card'
import { PeriodSelect } from './ChartControls'
import { employeeData } from '../../data/mockData'

const EmployeeTracking = () => (
  <Card className="w-full h-full">
    <CardHeader
      title={
        <span className="inline-flex items-center gap-2">
          Theo dõi nhân viên
          <span className="text-xs font-medium text-primary bg-primary-50 rounded-xxs px-2 py-[0.2rem]">Dữ liệu mẫu</span>
        </span>
      }
      actions={<PeriodSelect value="today" />}
    />
    <CardBody>
      <div className="grid grid-cols-3 gap-1 border border-line rounded-lg overflow-hidden bg-line mb-5">
        {employeeData.stats.map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 px-2 py-4 bg-card text-center">
            <span className="order-1 text-sm text-ink-subtle">{s.label}</span>
            <span className="order-2 text-[2.4rem] font-extrabold text-ink leading-none">{s.value}</span>
          </div>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[4rem] text-left text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">STT</th>
            <th className="text-left text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">Top 5 nhân viên làm nhiều giờ nhất</th>
            <th className="text-right text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">Số giờ làm</th>
          </tr>
        </thead>
        <tbody>
          {employeeData.top5.map(emp => (
            <tr key={emp.rank} className="hover:bg-fill">
              <td className="text-ink-subtle text-md px-3 py-3 border-b border-line">{emp.rank}</td>
              <td className="text-md text-ink px-3 py-3 border-b border-line">{emp.name}</td>
              <td className="text-right whitespace-nowrap text-ink-subtle text-md px-3 py-3 border-b border-line">{emp.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardBody>
    <CardFooter className="flex items-center gap-2 text-sm text-ink-subtle [&_a]:text-primary [&_a]:font-medium">
      <span className="text-lg">💡</span>
      Quản lý chấm công - tính lương của cửa hàng <a href="#" onClick={e => e.preventDefault()}>tại đây</a>
    </CardFooter>
  </Card>
)

export default EmployeeTracking
