export interface NavigationChild {
  label: string
  href: string
}

export interface NavigationItem {
  id: number
  label: string
  href?: string
  allowedRoles?: string[]
  children: NavigationChild[]
}

export const navItems: NavigationItem[] = [
  { id: 1, label: 'Tổng quan', href: '#/manager/dashboard', children: [] },
  {
    id: 2,
    label: 'Thực đơn',
    children: [{ label: 'Món', href: '#/manager/products' }],
  },
  {
    id: 3,
    label: 'Phòng/Bàn',
    children: [{ label: 'Danh sách phòng bàn', href: '#/manager/rooms' }],
  },
  {
    id: 4,
    label: 'Giao dịch',
    children: [
      { label: 'Hóa đơn', href: '#/manager/invoices' },
      { label: 'Khuyến mãi', href: '#/manager/promotions' },
    ],
  },
  {
    id: 8,
    label: 'Nhân viên',
    allowedRoles: ['MANAGER', 'ADMIN'],
    children: [
      { label: 'Danh sách nhân viên', href: '#/manager/employees' },
      { label: 'Lịch làm việc', href: '#/manager/schedule' },
      { label: 'Bảng chấm công', href: '#/manager/timesheet' },
      { label: 'Bảng lương', href: '#/manager/payroll' },
    ],
  },
  { id: 6, label: 'Sổ quỹ', href: '#/manager/cash-book', children: [] },
  {
    id: 7,
    label: 'Báo cáo',
    children: [
      { label: 'Cuối ngày', href: '#/manager/reports/daily-summary' },
      { label: 'Thu chi', href: '#/manager/reports/financial' },
    ],
  },
  {
    id: 13,
    label: 'Nhật ký',
    allowedRoles: ['MANAGER', 'ADMIN'],
    children: [{ label: 'Nhật ký thao tác', href: '#/manager/audit-logs' }],
  },
]
