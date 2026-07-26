import type { ReactNode } from 'react'
import type { Employee } from '../../data/mockData'

export interface EmployeeColumn {
  key: string
  label: string
  width?: string
  render: (employee: Employee) => ReactNode
}

// Shared by the column picker and the table so their keys cannot drift apart.
export const EMPLOYEE_COLUMNS: EmployeeColumn[] = [
  {
    key: 'code',
    label: 'Mã nhân viên',
    width: 'w-[13rem]',
    render: employee => <span className="text-primary font-medium">{employee.code}</span>,
  },
  { key: 'timekeepCode', label: 'Mã chấm công', width: 'w-[13rem]', render: employee => employee.timekeepCode },
  { key: 'name', label: 'Tên nhân viên', render: employee => employee.name },
  { key: 'phone', label: 'Số điện thoại', width: 'w-[14rem]', render: employee => employee.phone },
  { key: 'idNumber', label: 'Số CMND/CCCD', width: 'w-[15rem]', render: employee => employee.idNumber },
  {
    key: 'note',
    label: 'Ghi chú',
    width: 'w-[16rem]',
    render: employee => <span className="text-ink-muted">{employee.note}</span>,
  },
]

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> =
  Object.fromEntries(EMPLOYEE_COLUMNS.map(column => [column.key, true]))
