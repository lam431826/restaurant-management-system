/* ─── Mock data extracted from saved KiotViet HTML ───────────────────────── */

export const kpiData = {
  netRevenue: {
    today: 7_283_000,
    trendPct: 166,
    trendDir: 'up' as const,
    discountAmount: 12_000,
    returns: 0,
    returnCount: 0,
  },
  orders: {
    today: 3,
    trendPct: 0,
    trendDir: 'up' as const,
    avgOrderValue: 2_427_667,
    customersPerOrder: 4,
  },
  tableRate: {
    pct: 0,
    activeTables: 0,
    totalTables: 32,
    activeOrders: 0,
    activeCustomers: 0,
  },
};

export const branches = [
  { id: 212797, name: 'Chi nhánh trung tâm' },
];

export const timeOptions = [
  { id: 1, text: 'Hôm nay' },
  { id: 2, text: 'Hôm qua' },
  { id: 3, text: '7 ngày qua' },
  { id: 4, text: '30 ngày qua' },
  { id: 5, text: 'Tháng này' },
  { id: 6, text: 'Tháng trước' },
];

/* ─── Doanh thu thuần (Net revenue chart) ────────────────────────────────── */
export const netRevenueChart = {
  total: 16_251_000,
  invoiceCount: 11,
  byHour: [
    { label: '00:00', value: 7_000_000 },
    { label: '08:00', value: 1_800_000 },
    { label: '09:00', value: 300_000 },
    { label: '10:00', value: 350_000 },
    { label: '18:00', value: 1_900_000 },
    { label: '19:00', value: 1_100_000 },
    { label: '20:00', value: 600_000 },
    { label: '21:00', value: 900_000 },
    { label: '22:00', value: 800_000 },
  ],
  byDay: [
    { label: 'T2', value: 1_200_000 },
    { label: 'T3', value: 980_000 },
    { label: 'T4', value: 1_540_000 },
    { label: 'T5', value: 870_000 },
    { label: 'T6', value: 2_100_000 },
    { label: 'T7', value: 3_400_000 },
    { label: 'CN', value: 7_283_000 },
  ],
  byWeekday: [
    { label: 'Thứ 2', value: 2_100_000 },
    { label: 'Thứ 3', value: 1_800_000 },
    { label: 'Thứ 4', value: 2_400_000 },
    { label: 'Thứ 5', value: 1_600_000 },
    { label: 'Thứ 6', value: 3_200_000 },
    { label: 'Thứ 7', value: 4_800_000 },
    { label: 'CN', value: 7_283_000 },
  ],
};

/* ─── Lượng khách hàng (Customer volume chart) ───────────────────────────── */
export const customerChart = {
  total: 55,
  byHour: [
    { label: '00:00', value: 12 },
    { label: '08:00', value: 4.5 },
    { label: '09:00', value: 8 },
    { label: '10:00', value: 6.2 },
    { label: '18:00', value: 4 },
    { label: '19:00', value: 5 },
    { label: '20:00', value: 8 },
    { label: '21:00', value: 6 },
    { label: '22:00', value: 5 },
  ],
  byDay: [
    { label: 'T2', value: 6 },
    { label: 'T3', value: 8 },
    { label: 'T4', value: 5 },
    { label: 'T5', value: 9 },
    { label: 'T6', value: 7 },
    { label: 'T7', value: 12 },
    { label: 'CN', value: 8 },
  ],
  byWeekday: [
    { label: 'Thứ 2', value: 6 },
    { label: 'Thứ 3', value: 8 },
    { label: 'Thứ 4', value: 5 },
    { label: 'Thứ 5', value: 9 },
    { label: 'Thứ 6', value: 7 },
    { label: 'Thứ 7', value: 12 },
    { label: 'CN', value: 8 },
  ],
};

/* ─── Hiệu quả thực đơn (Menu effectiveness) ─────────────────────────────── */
export const menuEffectiveness = {
  avgPerItem: 59_236,
  avgPerFood: 0,
  avgPerDrink: 0,
  groups: [
    { name: 'SÚP',               value: 38, color: '#0070f4' },
    { name: 'MÓN KHAI VỊ',       value: 32, color: '#00b63e' },
    { name: 'BIA & THUỐC LÁ',    value: 12, color: '#ff8800' },
    { name: 'CLASSIC COCKTAILS', value: 10, color: '#ef06bc' },
    { name: 'TEA',               value: 8,  color: '#ff4d4f' },
  ],
  detail: {
    'SÚP': [
      { rank: 1, name: 'Súp hành tây kiểu Pháp', qty: 29, revenue: 3_625_000 },
      { rank: 2, name: 'Súp kem rau 4 mùa',       qty: 12, revenue: 1_500_000 },
      { rank: 3, name: 'Súp kem kiểu Paris',      qty: 11, revenue: 1_375_000 },
      { rank: 4, name: 'Súp kem gà nữ hoàng',     qty: 6,  revenue: 750_000 },
    ],
  } as Record<string, { rank: number; name: string; qty: number; revenue: number }[]>,
};

/* ─── Tình trạng hủy món (Cancellation status) ───────────────────────────── */
export const cancellation = {
  cancelledItems: 0,
  cancelledInvoices: 0,
  categories: [
    { label: 'Hủy sau báo bếp', count: 0, color: 'danger',  empty: 'Chưa có món nào bị hủy' },
    { label: 'Hủy sau tạm tính', count: 0, color: 'warning', empty: 'Chưa có món nào bị hủy' },
    { label: 'Hủy khi kiểm đồ',  count: 0, color: 'neutral', empty: 'Chưa có món nào bị hủy' },
  ],
};

/* ─── Theo dõi nhân viên (Employee tracking) ─────────────────────────────── */
export const employeeData = {
  stats: [
    { label: 'Nhân viên đi làm',   value: 7 },
    { label: 'Nhân viên nghỉ làm', value: 0 },
    { label: 'Yêu cầu chờ duyệt',  value: 1 },
    { label: 'Nhân viên đi muộn',  value: 1 },
    { label: 'Nhân viên về sớm',   value: 1 },
    { label: 'Nhân viên làm thêm', value: 2 },
  ],
  top5: [
    { rank: 1, name: 'Lê Thị Bảo Trân',          hours: '9 giờ 30 phút' },
    { rank: 2, name: 'Nguyễn Thị Hồng Thảo Vân',  hours: '7 giờ 45 phút' },
    { rank: 3, name: 'Nguyễn Minh Loan',           hours: '6 giờ 33 phút' },
    { rank: 4, name: 'Lã Ngọc Anh',                hours: '6 giờ 15 phút' },
    { rank: 5, name: 'Trần Văn Hùng',              hours: '5 giờ 50 phút' },
  ],
};

/* ─── Kênh bán hàng (Sales channel chart) ────────────────────────────────── */
export const salesChannel = {
  byHour: [
    { label: '00:00', value: 7_000_000 },
    { label: '08:00', value: 500_000 },
    { label: '09:00', value: 200_000 },
    { label: '10:00', value: 300_000 },
    { label: '18:00', value: 2_000_000 },
    { label: '19:00', value: 1_800_000 },
    { label: '20:00', value: 1_200_000 },
    { label: '21:00', value: 1_000_000 },
    { label: '22:00', value: 1_000_000 },
  ],
  byDay: [
    { label: 'T2', value: 1_200_000 },
    { label: 'T3', value: 980_000 },
    { label: 'T4', value: 1_540_000 },
    { label: 'T5', value: 870_000 },
    { label: 'T6', value: 2_100_000 },
    { label: 'T7', value: 3_400_000 },
    { label: 'CN', value: 7_283_000 },
  ],
  byWeekday: [
    { label: 'Thứ 2', value: 2_100_000 },
    { label: 'Thứ 3', value: 1_800_000 },
    { label: 'Thứ 4', value: 2_400_000 },
    { label: 'Thứ 5', value: 1_600_000 },
    { label: 'Thứ 6', value: 3_200_000 },
    { label: 'Thứ 7', value: 4_800_000 },
    { label: 'CN', value: 7_283_000 },
  ],
};

/* ─── Hoạt động gần đây (Recent activities) ──────────────────────────────── */
export interface Activity {
  id: number;
  person: string;
  action: 'bán hàng' | 'nhập hàng';
  value: number;
  branch: string;
  time: string;
}

export const recentActivities: Activity[] = [
  { id: 1,  person: 'Hương - Kế Toán',  action: 'bán hàng',  value: 2_265_000, branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 2,  person: 'Hương - Kế Toán',  action: 'bán hàng',  value: 4_035_000, branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 3,  person: 'Hoàng - Kinh Doanh', action: 'bán hàng', value: 983_000,   branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 4,  person: 'Hương - Kế Toán',  action: 'nhập hàng', value: 1_949_000, branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 5,  person: 'Hương - Kế Toán',  action: 'nhập hàng', value: 3_564_000, branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 6,  person: 'Hoàng - Kinh Doanh', action: 'nhập hàng', value: 659_500, branch: 'Chi nhánh trung tâm', time: '4 phút trước' },
  { id: 7,  person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 465_000,   branch: 'Chi nhánh trung tâm', time: '14 giờ trước' },
  { id: 8,  person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 321_000,   branch: 'Chi nhánh trung tâm', time: '15 giờ trước' },
  { id: 9,  person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 1_950_000, branch: 'Chi nhánh trung tâm', time: '16 giờ trước' },
  { id: 10, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 245_000,   branch: 'Chi nhánh trung tâm', time: '1 ngày trước' },
  { id: 11, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 1_675_000, branch: 'Chi nhánh trung tâm', time: '1 ngày trước' },
  { id: 12, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 208_000,   branch: 'Chi nhánh trung tâm', time: '1 ngày trước' },
  { id: 13, person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 997_000,   branch: 'Chi nhánh trung tâm', time: '1 ngày trước' },
  { id: 14, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 1_005_000, branch: 'Chi nhánh trung tâm', time: '2 ngày trước' },
  { id: 15, person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 1_250_000, branch: 'Chi nhánh trung tâm', time: '2 ngày trước' },
  { id: 16, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 1_120_500, branch: 'Chi nhánh trung tâm', time: '3 ngày trước' },
  { id: 17, person: 'Hương - Kế Toán',  action: 'bán hàng',  value: 741_000,   branch: 'Chi nhánh trung tâm', time: '3 ngày trước' },
  { id: 18, person: 'Hương - Kế Toán',  action: 'nhập hàng', value: 804_000,   branch: 'Chi nhánh trung tâm', time: '4 ngày trước' },
  { id: 19, person: 'Nguyen Duc Anh',   action: 'bán hàng',  value: 1_335_000, branch: 'Chi nhánh trung tâm', time: '4 ngày trước' },
  { id: 20, person: 'Nguyen Duc Anh',   action: 'nhập hàng', value: 1_491_000, branch: 'Chi nhánh trung tâm', time: '5 ngày trước' },
];

/* ─── Products / Menu items (Thực đơn → Món) ─────────────────────────────── */
export interface Product {
  code: string;
  name: string;
  group: string;
  menuType: string;   // Loại thực đơn
  itemType: string;   // Loại món
  price: number;
  img: string;        // /assets/products/{n}.jpg
}

const mkImg = (code: string) => `/assets/products/${parseInt(code.slice(2), 10)}.jpg`;

const rawProducts: [string, string, string, number][] = [
  ['SP000021', 'Bia Heiniken',                                'BIA & THUỐC LÁ',    30_000],
  ['SP000022', 'Bia Hà Nội',                                  'BIA & THUỐC LÁ',    30_000],
  ['SP000023', 'Thuốc lá Vinataba',                           'BIA & THUỐC LÁ',    30_000],
  ['SP000024', 'Thuốc lá Marlboro',                           'BIA & THUỐC LÁ',    30_000],
  ['SP000025', 'Thuốc lá Kent HD',                            'BIA & THUỐC LÁ',    30_000],
  ['SP000006', 'CBánh mỳ bỏ lò dăm bông & phomai',            'MÓN KHAI VỊ',       125_000],
  ['SP000007', 'Thịt nguội & phomai viên chiên kiểu Tây Ba Nha', 'MÓN KHAI VỊ',    125_000],
  ['SP000008', 'Đĩa thịt nguội Tây Ba Nha hảo hạng',          'MÓN KHAI VỊ',       125_000],
  ['SP000009', 'Phomai dây Nga',                              'MÓN KHAI VỊ',       125_000],
  ['SP000010', 'Xúc xích Đức nướng mù tạt vàng',              'MÓN KHAI VỊ',       125_000],
  ['SP000011', 'Súp kem rau 4 mùa',                           'SÚP',               125_000],
  ['SP000012', 'Súp kem gà nữ hoàng',                         'SÚP',               125_000],
  ['SP000013', 'Súp hành tây kiểu Pháp',                      'SÚP',               125_000],
  ['SP000014', 'Súp kém bí đỏ với sữa dừa',                   'SÚP',               125_000],
  ['SP000015', 'Súp kem kiểu Paris',                          'SÚP',               125_000],
  ['SP000016', 'Lemon Tea',                                   'TEA',               15_000],
  ['SP000017', 'Peach Tea',                                   'TEA',               15_000],
  ['SP000018', 'Mint Tea',                                    'TEA',               15_000],
  ['SP000019', 'Lipton with milk',                            'TEA',               15_000],
  ['SP000020', 'Lemon Juice',                                 'TEA',               15_000],
  ['SP000001', 'MILANO',                                      'CLASSIC COCKTAILS', 30_000],
  ['SP000002', 'APEROL SPRITZ',                               'CLASSIC COCKTAILS', 30_000],
  ['SP000003', 'CUBA LIBRE',                                  'CLASSIC COCKTAILS', 30_000],
  ['SP000004', 'GIN FIZZ',                                    'CLASSIC COCKTAILS', 30_000],
  ['SP000005', 'BLOODY MARY',                                 'CLASSIC COCKTAILS', 30_000],
];

export const products: Product[] = rawProducts.map(([code, name, group, price]) => ({
  code,
  name,
  group,
  menuType: 'Khác',
  itemType: 'Món thường',
  price,
  img: mkImg(code),
}));

export const menuGroups = ['BIA & THUỐC LÁ', 'MÓN KHAI VỊ', 'SÚP', 'TEA', 'CLASSIC COCKTAILS'];

/* ─── Phòng / Bàn (Tables & Rooms → Danh sách phòng bàn) ─────────────────── */
export interface Room {
  id: number;
  name: string;       // Tên phòng/bàn
  note: string;       // Ghi chú
  area: string;       // Khu vực
  seats: number;      // Số ghế
  active: boolean;    // Trạng thái (Đang hoạt động / Ngừng hoạt động)
  order: number;      // Số thứ tự
}

export const roomAreas = ['Phòng VIP', 'Lầu 2', 'Lầu 3'];

const buildRooms = (): Room[] => {
  const list: Room[] = [];
  let id = 1;
  // Built in display order (matches the model screen): Lầu 3 → Lầu 2 → Phòng VIP
  for (let n = 20; n >= 11; n--) list.push({ id: id++, name: `Bàn ${n}`, note: '', area: 'Lầu 3', seats: 0, active: true, order: 0 });
  for (let n = 10; n >= 1; n--) list.push({ id: id++, name: `Bàn ${n}`, note: '', area: 'Lầu 2', seats: 0, active: true, order: 0 });
  for (let n = 10; n >= 1; n--) list.push({ id: id++, name: `VIP ${n}`, note: '', area: 'Phòng VIP', seats: 0, active: true, order: 0 });
  return list;
};

export const rooms: Room[] = buildRooms();

/* ─── Giao dịch → Hóa đơn (Transactions / Invoices) ──────────────────────── */
export type InvoiceStatus = 'processing' | 'completed' | 'undelivered' | 'cancelled';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  undelivered: 'Không giao được',
  cancelled: 'Đã hủy',
};

export interface InvoiceLine {
  code: string;
  name: string;
  qty: number;
  price: number;     // Đơn giá
  discount: number;  // Giảm giá (per line)
  sellPrice: number; // Giá bán
}

export interface Invoice {
  code: string;        // Mã hóa đơn
  time: string;        // Thời gian (Giờ đi)
  customer: string;    // Khách hàng
  status: InvoiceStatus;
  channel: string;     // Kênh bán
  method: string;      // Phương thức thanh toán
  table: string;       // Phòng/bàn
  area: string;        // Khu vực
  branch: string;      // Chi nhánh
  receiver: string;    // Người nhận đơn
  creator: string;     // Người tạo
  guests: number;      // Số khách
  priceBook: string;   // Bảng giá
  note: string;        // Ghi chú
  discount: number;    // Giảm giá hóa đơn (invoice-level)
  paid: number;        // Khách đã trả
  lines: InvoiceLine[];
}

const mkLine = (code: string, name: string, qty: number, price: number, discount = 0): InvoiceLine => ({
  code, name, qty, price, discount, sellPrice: price - discount,
});

export const invoiceTotals = (inv: Invoice) => {
  const totalQty = inv.lines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = inv.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const lineDiscount = inv.lines.reduce((s, l) => s + l.qty * l.discount, 0);
  return { totalQty, totalAmount, lineDiscount };
};

export const invoices: Invoice[] = [
  {
    code: 'HD000048', time: '17/06/2026 00:00', customer: 'Anh Hoàng - Sài Gòn',
    status: 'completed', channel: 'Khách đến trực tiếp', method: 'Tiền mặt',
    table: 'Bàn 17', area: 'Lầu 3', branch: 'Chi nhánh trung tâm',
    receiver: 'Hương - Kế Toán', creator: 'Hương - Kế Toán', guests: 8,
    priceBook: 'Bảng giá chung', note: '', discount: 5_000, paid: 2_265_000,
    lines: [
      mkLine('SP000017', 'Peach Tea', 18, 15_000, 0),
      mkLine('SP000006', 'CBánh mỳ bỏ lò dăm bông & phomai', 16, 125_000, 0),
    ],
  },
  {
    code: 'HD000049', time: '17/06/2026 00:00', customer: 'Anh Hoàng - Sài Gòn',
    status: 'completed', channel: 'Khách đến trực tiếp', method: 'Chuyển khoản',
    table: 'Bàn 12', area: 'Lầu 3', branch: 'Chi nhánh trung tâm',
    receiver: 'Hoàng - Kinh Doanh', creator: 'Hoàng - Kinh Doanh', guests: 6,
    priceBook: 'Bảng giá chung', note: '', discount: 0, paid: 4_035_000,
    lines: [
      mkLine('SP000013', 'Súp hành tây kiểu Pháp', 18, 125_000, 0),
      mkLine('SP000016', 'Lemon Tea', 119, 15_000, 0),
    ],
  },
  {
    code: 'HD000050', time: '17/06/2026 00:00', customer: 'Anh Hoàng - Sài Gòn',
    status: 'completed', channel: 'Khách đến trực tiếp', method: 'Tiền mặt',
    table: 'Bàn 5', area: 'Lầu 2', branch: 'Chi nhánh trung tâm',
    receiver: 'Hương - Kế Toán', creator: 'Hương - Kế Toán', guests: 4,
    priceBook: 'Bảng giá chung', note: 'Giảm giá cho khách quen', discount: 7_000, paid: 983_000,
    lines: [
      mkLine('SP000011', 'Súp kem rau 4 mùa', 6, 125_000, 0),
      mkLine('SP000020', 'Lemon Juice', 16, 15_000, 0),
    ],
  },
  {
    code: 'HD000047', time: '16/06/2026 21:30', customer: 'Khách lẻ',
    status: 'processing', channel: 'Khách đến trực tiếp', method: 'Tiền mặt',
    table: 'Bàn 3', area: 'Lầu 2', branch: 'Chi nhánh trung tâm',
    receiver: 'Nguyen Duc Anh', creator: 'Nguyen Duc Anh', guests: 2,
    priceBook: 'Bảng giá chung', note: '', discount: 0, paid: 0,
    lines: [
      mkLine('SP000021', 'Bia Heiniken', 10, 30_000, 0),
      mkLine('SP000024', 'Thuốc lá Marlboro', 3, 30_000, 0),
    ],
  },
  {
    code: 'HD000046', time: '16/06/2026 20:05', customer: 'Chị Lan - Hà Nội',
    status: 'completed', channel: 'Bán mang về', method: 'Ví điện tử',
    table: 'VIP 2', area: 'Phòng VIP', branch: 'Chi nhánh trung tâm',
    receiver: 'Lê Thị Bảo Trân', creator: 'Lê Thị Bảo Trân', guests: 5,
    priceBook: 'Bảng giá chung', note: '', discount: 0, paid: 724_000,
    lines: [
      mkLine('SP000001', 'MILANO', 8, 30_000, 2_000),
      mkLine('SP000012', 'Súp kem gà nữ hoàng', 4, 125_000, 0),
    ],
  },
  {
    code: 'HD000045', time: '16/06/2026 19:12', customer: 'Khách lẻ',
    status: 'cancelled', channel: 'Khách đến trực tiếp', method: 'Tiền mặt',
    table: 'Bàn 8', area: 'Lầu 2', branch: 'Chi nhánh trung tâm',
    receiver: 'Trần Văn Hùng', creator: 'Trần Văn Hùng', guests: 3,
    priceBook: 'Bảng giá chung', note: 'Khách hủy đơn', discount: 0, paid: 0,
    lines: [
      mkLine('SP000010', 'Xúc xích Đức nướng mù tạt vàng', 2, 125_000, 0),
    ],
  },
];

/* ─── Đặt bàn (Reception / Table reservations) ───────────────────────────── */
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED';

export const reservationStatusMeta: Record<ReservationStatus, { label: string; color: string }> = {
  PENDING:    { label: 'Chờ xác nhận',       color: 'var(--kv-warning)' },
  CONFIRMED:  { label: 'Đã xác nhận',        color: 'var(--kv-success)' },
  CHECKED_IN: { label: 'Đã nhận bàn',        color: 'var(--kv-primary)' },
  NO_SHOW:    { label: 'Không đến',           color: 'var(--kv-neutral-400)' },
  CANCELLED:  { label: 'Đã hủy',             color: 'var(--kv-danger)' },
};

export interface Reservation {
  id: string;          // UUID từ backend
  code: string;        // Mã hiển thị (viết tắt từ id)
  arriveTime: string;  // Giờ đến định dạng dd/MM/yyyy HH:mm
  customer: string;    // Tên khách
  phone: string;       // Điện thoại
  guests: number;      // Số khách
  table: string;       // tableId hoặc '—'
  area: string;
  status: ReservationStatus;
  note: string;
  startHour: number;   // giờ bắt đầu dạng số thực (e.g. 21.5)
  durationH: number;   // thời lượng giờ
}

export const reservations: Reservation[] = [];

/* Timeline rows grouped by area, in reception display order */
export const reservationAreaOrder = ['Phòng VIP', 'Lầu 2', 'Lầu 3'];

/* ─── Nhân viên (Staff / Employees → Danh sách nhân viên) ────────────────── */
export interface Employee {
  id: number;
  code: string;          // Mã nhân viên (NV000001)
  timekeepCode: string;  // Mã chấm công
  name: string;          // Tên nhân viên
  phone: string;         // Số điện thoại
  idNumber: string;      // Số CMND/CCCD
  debt: number;          // Nợ và tạm ứng
  note: string;          // Ghi chú
  department: string;    // Phòng ban
  position: string;      // Chức danh
  active: boolean;       // Đang làm việc / Đã nghỉ
}

export const departments = ['Quản lý', 'Thu ngân', 'Phục vụ', 'Bếp', 'Kế toán'];
export const positions = ['Quản lý cửa hàng', 'Nhân viên thu ngân', 'Nhân viên phục vụ', 'Đầu bếp', 'Kế toán'];

const rawEmployees: [string, string, string, string, number, string, string][] = [
  // name, phone, idNumber, department, debt, position, timekeepCode
  ['Lê Thị Bảo Trân',           '0905123456', '079123456789', 'Quản lý', 0,        'Quản lý cửa hàng',   'CC001'],
  ['Nguyễn Thị Hồng Thảo Vân',  '0905234567', '079234567890', 'Thu ngân', 0,       'Nhân viên thu ngân', 'CC002'],
  ['Nguyễn Minh Loan',          '0905345678', '079345678901', 'Phục vụ', 500_000,  'Nhân viên phục vụ',  'CC003'],
  ['Lã Ngọc Anh',               '0905456789', '079456789012', 'Phục vụ', 0,        'Nhân viên phục vụ',  'CC004'],
  ['Trần Văn Hùng',             '0905567890', '079567890123', 'Bếp', 1_000_000,    'Đầu bếp',            'CC005'],
  ['Hương - Kế Toán',           '0905678901', '079678901234', 'Kế toán', 0,        'Kế toán',            'CC006'],
  ['Hoàng - Kinh Doanh',        '0905789012', '079789012345', 'Quản lý', 0,        'Quản lý cửa hàng',   'CC007'],
];

export const employees: Employee[] = rawEmployees.map(
  ([name, phone, idNumber, department, debt, position, timekeepCode], i) => ({
    id: i + 1,
    code: 'NV' + String(i + 1).padStart(6, '0'),
    timekeepCode,
    name,
    phone,
    idNumber,
    debt,
    note: '',
    department,
    position,
    active: true,
  })
);

/* ─── Promo links (sidebar top) ──────────────────────────────────────────── */
export const promoLinks = [
  { id: 1, title: 'Giao món siêu tốc', subtitle: 'Grab, Ahamove, XanhSM',                icon: 'delivery' },
  { id: 2, title: 'Thanh toán',         subtitle: 'Cài đặt QR tĩnh miễn phí',              icon: 'payment' },
  { id: 3, title: 'Vay vốn',            subtitle: 'Giải ngân tới 1 tỷ đồng chỉ trong 24H', icon: 'loan' },
];

export const helpLinks = [
  { label: 'Hướng dẫn sử dụng', icon: 'question', href: 'https://kiotviet.vn/ho-tro/?type=fnb' },
  { label: 'TeamViewer', icon: 'teamview', img: '/assets/teamview.svg', href: 'https://get.teamviewer.com/kiotviet18006162' },
  { label: 'UltraViewer', icon: 'ultra', img: '/assets/ultra.svg', href: '#' },
  { label: 'AnyDesk', icon: 'any', img: '/assets/any.svg', href: 'https://download.anydesk.com/AnyDesk.exe' },
  { label: 'Cài Driver cho phần cứng', icon: 'driver', img: '/assets/driver-install.svg', href: '#' },
];

export const cashierModes = [
  { id: 12, label: 'Lễ tân', icon: 'ik-calendar-day' },
  { id: 11, label: 'Nhà bếp', icon: 'ik-bell-concierge' },
];

/* href '#' = screen not yet implemented (placeholder, does not navigate).    */
/* allowedRoles: undefined = visible to all roles in /manager (MANAGER+ADMIN) */
export const navItems = [
  {
    id: 1,
    label: 'Tổng quan',
    href: '#/manager/dashboard',
    active: true,
    children: [],
  },
  {
    id: 2,
    label: 'Thực đơn',
    children: [
      { label: 'Món', href: '#/manager/products' },
      { label: 'Ghi chú món (Tùy chọn)', href: '#' },
      { divider: true },
      { label: 'Thiết lập giá', href: '#' },
    ],
  },
  {
    id: 12,
    label: 'Kho hàng',
    children: [
      { groupTitle: 'Kho hàng' },
      { label: 'Danh sách hàng hóa', href: '#' },
      { label: 'Kiểm kho', href: '#' },
      { label: 'Xuất hủy', href: '#' },
      { groupTitle: 'Nhập hàng' },
      { label: 'Nhập hàng', href: '#' },
      { label: 'Hóa đơn đầu vào', href: '#' },
      { label: 'Trả hàng nhập', href: '#' },
      { label: 'Nhà cung cấp', href: '#' },
    ],
  },
  {
    id: 3,
    label: 'Phòng/Bàn',
    children: [
      { label: 'Danh sách phòng bàn', href: '#/manager/rooms' },
      { label: 'Gọi món qua mã QR', href: '#' },
    ],
  },
  {
    id: 4,
    label: 'Giao dịch',
    children: [
      { label: 'Hóa đơn', href: '#/manager/invoices' },
      { label: 'Trả hàng', href: '#' },
    ],
  },
  {
    id: 5,
    label: 'Đối tác',
    children: [
      { label: 'Khách hàng', href: '#' },
      { label: 'Tương tác', href: '#' },
      { label: 'Đối tác giao hàng', href: '#' },
    ],
  },
  {
    id: 8,
    label: 'Nhân viên',
    allowedRoles: ['ADMIN'] as string[],
    children: [
      { label: 'Danh sách nhân viên', href: '#/manager/employees' },
      { label: 'Lịch làm việc', href: '#' },
      { label: 'Bảng chấm công', href: '#' },
      { label: 'Bảng lương', href: '#' },
      { label: 'Bảng hoa hồng', href: '#' },
      { label: 'Thiết lập nhân viên', href: '#' },
    ],
  },
  {
    id: 10,
    label: 'Bán Online',
    children: [
      { label: 'Bán hàng Zalo', href: '#' },
      { label: 'Bán hàng Facebook', href: '#' },
      { label: 'Website bán hàng', href: '#' },
    ],
  },
  {
    id: 6,
    label: 'Sổ quỹ',
    href: '#',
    children: [],
  },
  {
    id: 7,
    label: 'Báo cáo',
    children: [
      { label: 'Cuối ngày', href: '#' },
      { label: 'Bán hàng', href: '#' },
      { label: 'Hàng hóa', href: '#' },
      { label: 'Khách hàng', href: '#' },
      { label: 'Nhà cung cấp', href: '#' },
      { label: 'Nhân viên', href: '#' },
      { label: 'Kênh bán hàng', href: '#' },
      { label: 'Tài chính', href: '#' },
    ],
  },
  {
    id: 11,
    label: 'Thuế & Kế toán',
    children: [
      { label: 'Thuế & Kế toán', href: '#' },
      { label: 'Hóa đơn điện tử', href: '#' },
    ],
  },
];
