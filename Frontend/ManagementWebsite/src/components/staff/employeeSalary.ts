import type { SalaryType } from '../../api/employees'

export type Rate = { amount: string; unit: 'percent' | 'vnd' } | null

export interface DayRates {
  sat: Rate
  sun: Rate
  off: Rate
  holiday: Rate
}

export interface OtRates extends DayRates {
  normal: Rate
}

export interface SalaryConfig {
  base: string
  def: DayRates
  overtimeEnabled: boolean
  ot: OtRates
}

const percentageRate = (amount: string): Rate => ({ amount, unit: 'percent' })

export const rateLabel = (rate: Rate) =>
  rate
    ? rate.unit === 'percent'
      ? `${rate.amount}%`
      : `${Number(rate.amount || 0).toLocaleString('en-US')}`
    : ''

export const defaultSalaryConfig = (): SalaryConfig => ({
  base: '0',
  def: {
    sat: null,
    sun: null,
    off: percentageRate('100'),
    holiday: percentageRate('100'),
  },
  overtimeEnabled: false,
  ot: {
    normal: percentageRate('150'),
    sat: percentageRate('200'),
    sun: percentageRate('200'),
    off: percentageRate('200'),
    holiday: percentageRate('300'),
  },
})

export const salaryTypes = ['Theo ca làm việc', 'Theo giờ làm việc', 'Cố định']

export const LABEL_TO_SALARY_TYPE: Record<string, SalaryType> = {
  'Theo ca làm việc': 'SHIFT',
  'Theo giờ làm việc': 'HOURLY',
  'Cố định': 'FIXED',
}

export const SALARY_TYPE_TO_LABEL: Record<SalaryType, string> = {
  SHIFT: 'Theo ca làm việc',
  HOURLY: 'Theo giờ làm việc',
  FIXED: 'Cố định',
}

export const parseRates = (json: string | null): DayRates | null => {
  if (!json) return null
  try {
    return JSON.parse(json) as DayRates
  } catch {
    return null
  }
}
