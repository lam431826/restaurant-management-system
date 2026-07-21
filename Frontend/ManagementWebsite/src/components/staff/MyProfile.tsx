import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyEmployeeProfile, saveMyEmployeeProfile } from '../../api/employees'
import type { MyEmployeeProfileDto } from '../../api/employees'
import { inputCls, Field, SectionCard } from './EmployeeModal'

const defaultRouteForRole = (role?: string) => {
  if (role === 'MANAGER' || role === 'ADMIN') return '/manager/dashboard'
  if (role === 'CASHIER') return '/cashier'
  return '/waiter'
}

const MyProfile = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [profile, setProfile] = useState<MyEmployeeProfileDto | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [note, setNote] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyEmployeeProfile()
      .then(res => {
        const p = res.data.data
        setProfile(p)
        setName(p.name)
        setPhone(p.phone)
        setEmail(p.email ?? '')
        setStartDate(p.startDate ?? '')
        setNote(p.note ?? '')
        setIdNumber(p.idNumber ?? '')
        setBirthday(p.birthday ?? '')
        setGender(p.gender ?? '')
        setAddress(p.address ?? '')
      })
      .catch(() => setError('Không thể tải hồ sơ, vui lòng thử lại.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setError('')
    setSuccess('')
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Bắt buộc'
    if (!phone.trim()) errs.phone = 'Bắt buộc'
    else if (!/^0\d{9,10}$/.test(phone.trim())) errs.phone = 'SĐT phải bắt đầu bằng 0, 10-11 chữ số'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email không hợp lệ'
    if (Object.keys(errs).length) { setFieldErrors(errs); nameRef.current?.focus(); return }
    setFieldErrors({})

    setSaving(true)
    try {
      const res = await saveMyEmployeeProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        startDate: startDate || undefined,
        note: note.trim() || undefined,
        idNumber: idNumber.trim() || undefined,
        birthday: birthday || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
      })
      setProfile(res.data.data)
      // Bug fix: the saved name/phone/email were previously only reflected server-side
      // (users + employees tables) — the cached session must be updated too, or the UI
      // keeps showing stale data until the next login.
      updateUser({ fullName: res.data.data.name })
      setSuccess('Đã lưu hồ sơ.')
    } catch (err: any) {
      const code = err.response?.data?.error
      if (code === 'DUPLICATE_EMPLOYEE_PHONE' || code === 'DUPLICATE_PHONE') {
        setFieldErrors({ phone: 'Số điện thoại đã được sử dụng' })
      } else if (code === 'DUPLICATE_EMAIL') {
        setFieldErrors({ email: 'Email đã được sử dụng bởi tài khoản khác' })
      } else if (code === 'EMPLOYEE_USER_ALREADY_LINKED') {
        setError('Hồ sơ đã tồn tại, vui lòng tải lại trang.')
      } else {
        setError(err.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-screen bg-surface overflow-y-auto">
      <header className="flex items-center justify-between px-6 h-16 bg-card border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill"
            onClick={() => navigate(defaultRouteForRole(user.role))}
            aria-label="Quay lại"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <h1 className="text-h3 font-bold text-ink">Hồ sơ của tôi</h1>
        </div>
        <span className="text-md text-ink-subtle">{user.fullName}</span>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-4 max-w-[60rem] w-full mx-auto">
        {loading ? (
          <div className="text-md text-ink-subtle text-center py-10">Đang tải...</div>
        ) : (
          <>
            {error && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}
            {success && <div className="px-4 py-2 rounded-md bg-success-50 text-success text-md border border-success/30">{success}</div>}

            <SectionCard title="Thông tin cơ bản">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                <Field label="Tên nhân viên">
                  <input ref={nameRef} className={inputCls} placeholder="Bắt buộc" value={name}
                    onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: '' })) }} />
                  {fieldErrors.name && <p className="text-sm text-danger">{fieldErrors.name}</p>}
                </Field>
                <Field label="Mã nhân viên">
                  <input className={`${inputCls} bg-fill text-ink-muted`} value={profile?.code ?? 'Tự động (sau khi lưu)'} readOnly disabled />
                </Field>
                <Field label="Số điện thoại">
                  <input className={inputCls} inputMode="tel" placeholder="Bắt buộc" value={phone}
                    onChange={e => { setPhone(e.target.value); if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: '' })) }} />
                  {fieldErrors.phone && <p className="text-sm text-danger">{fieldErrors.phone}</p>}
                </Field>
                <Field label="Email">
                  <input className={inputCls} type="email" placeholder="email@example.com" value={email}
                    onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' })) }} />
                  {fieldErrors.email && <p className="text-sm text-danger">{fieldErrors.email}</p>}
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Thông tin công việc" collapsible>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                <Field label="Ngày bắt đầu làm việc">
                  <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field label="Ghi chú">
                  <input className={inputCls} placeholder="Nhập ghi chú" value={note} onChange={e => setNote(e.target.value)} />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Thông tin cá nhân" collapsible>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                <Field label="Số CMND/CCCD">
                  <input className={inputCls} inputMode="numeric" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
                </Field>
                <div className="flex gap-6">
                  <Field label="Ngày sinh" className="flex-1">
                    <input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} />
                  </Field>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-md text-ink-subtle">Giới tính</label>
                    <div className="flex items-center gap-5 h-11">
                      {['Nam', 'Nữ'].map(g => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer text-md text-ink">
                          <input type="radio" name="gender" className="accent-[var(--kv-primary)] w-4 h-4"
                            checked={gender === g} onChange={() => setGender(g)} />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <Field label="Địa chỉ" className="sm:col-span-2">
                  <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} />
                </Field>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button className="kv-btn kv-btn-primary h-11" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : profile?.id ? 'Cập nhật hồ sơ' : 'Tạo hồ sơ'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MyProfile
