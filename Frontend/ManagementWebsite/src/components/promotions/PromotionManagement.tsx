import { useCallback, useEffect, useMemo, useState } from 'react'
import PromotionModal from './PromotionModal'
import PromotionTable from './PromotionTable'
import PromotionFilters from './PromotionFilters'
import type { PromotionFilterState } from './PromotionFilters'
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from '../../services/promotionApi'
import type {
  CreatePromotionRequest,
  Promotion,
  UpdatePromotionRequest,
} from '../../services/promotionApi'

const initialFilters: PromotionFilterState = { search: '', status: 'all' }

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filters, setFilters] = useState<PromotionFilterState>(initialFilters)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPromotions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPromotions(await getPromotions())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khuyến mãi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPromotions()
  }, [loadPromotions])

  const filteredPromotions = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase()
    return promotions.filter(promotion => {
      if (filters.status === 'active' && !promotion.active) return false
      if (filters.status === 'inactive' && promotion.active) return false
      if (keyword && !`${promotion.code} ${promotion.description}`.toLowerCase().includes(keyword)) return false
      return true
    })
  }, [promotions, filters])

  const openCreate = () => {
    setEditingPromotion(null)
    setShowForm(true)
    setSuccess('')
  }

  const openEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setShowForm(true)
    setSuccess('')
  }

  const handleSave = async (request: CreatePromotionRequest | UpdatePromotionRequest) => {
    if (editingPromotion) {
      await updatePromotion(editingPromotion.id, request as UpdatePromotionRequest)
      setSuccess('Cập nhật khuyến mãi thành công')
    } else {
      await createPromotion(request as CreatePromotionRequest)
      setSuccess('Tạo khuyến mãi thành công')
    }
    setShowForm(false)
    setEditingPromotion(null)
    await loadPromotions()
  }

  const handleDeactivate = async (promotion: Promotion) => {
    if (!promotion.active) return
    const confirmed = window.confirm(`Ngừng hoạt động khuyến mãi ${promotion.code}?`)
    if (!confirmed) return

    setDeletingId(promotion.id)
    setError('')
    setSuccess('')
    try {
      await deletePromotion(promotion.id)
      setSuccess(`Đã ngừng hoạt động khuyến mãi ${promotion.code}`)
      await loadPromotions()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể ngừng hoạt động khuyến mãi')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-5 pb-4 overflow-y-auto border-r border-line bg-card">
        <PromotionFilters initialState={initialFilters} onApply={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-h3 font-bold text-ink">Quản lý khuyến mãi</h1>
            <p className="text-md text-ink-subtle mt-1">Theo dõi mã giảm giá, thời hạn và số lượt sử dụng</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => void loadPromotions()} disabled={loading}>
              Làm mới
            </button>
            <button type="button" className="kv-btn kv-btn-primary h-10" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Khuyến mãi
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-danger-50 text-danger-700 text-md" role="alert">
            <span>{error}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => void loadPromotions()}>Thử lại</button>
          </div>
        )}
        {success && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-success-50 text-success-700 text-md" role="status">
            <span>{success}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => setSuccess('')}>Đóng</button>
          </div>
        )}

        <PromotionTable
          promotions={filteredPromotions}
          loading={loading}
          deletingId={deletingId}
          onEdit={openEdit}
          onDeactivate={handleDeactivate}
        />
      </section>

      {showForm && (
        <PromotionModal
          promotion={editingPromotion ?? undefined}
          onClose={() => { setShowForm(false); setEditingPromotion(null) }}
          onSubmit={handleSave}
        />
      )}
    </div>
  )
}

export default PromotionManagement
