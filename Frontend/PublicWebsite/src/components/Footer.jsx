export default function Footer() {
  return (
    <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex items-center justify-center px-6 py-5">
      <div className="flex items-center gap-[50px] flex-wrap justify-center">
        <span className="text-[#efe7d2] text-sm leading-[1.5] whitespace-nowrap" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
          151 Phùng Hưng, Cửa Đông, Hoàn Kiếm, Hà Nội
        </span>
        <Diamond />
        <div className="text-[#efe7d2] text-sm leading-[1.5]" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
          <p className="m-0">SĐT: 0975919989</p>
          <p className="m-0">Email: wasabisushi@gmail.com</p>
        </div>
        <Diamond />
        <span className="text-[#efe7d2] text-sm leading-[1.5] whitespace-nowrap" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
          Open 16:00 pm — Close 22:30 pm
        </span>
      </div>
    </div>
  )
}

function Diamond() {
  return (
    <div className="flex items-center justify-center size-[11.3px] shrink-0">
      <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
    </div>
  )
}
