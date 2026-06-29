import { endOfDay, endOfMonth, isAfter, isBefore, parseISO, startOfDay, startOfMonth, subMonths } from 'date-fns'
import type { Expense } from '@/features/expenses/types'
import type { Task } from '@/features/tasks/types'

export type PeriodMode = 'month' | 'all' | 'custom'

export type PeriodState = {
  mode: PeriodMode
  monthDate: Date
  customStart: string | undefined
  customEnd: string | undefined
}

export const getRangeFromState = (s: PeriodState): { start: Date | null; end: Date | null } => {
  switch (s.mode) {
    case 'month':
      return { start: startOfMonth(s.monthDate), end: endOfMonth(s.monthDate) }
    case 'all':
      return { start: null, end: null }
    case 'custom':
      return {
        start: s.customStart ? startOfDay(parseISO(s.customStart)) : null,
        end: s.customEnd ? endOfDay(parseISO(s.customEnd)) : null,
      }
  }
}

// 이전 기간 (델타 비교용) — 월 모드만 의미 있음
export const getPrevRangeFromState = (s: PeriodState): { start: Date | null; end: Date | null } => {
  if (s.mode === 'month') {
    const prev = subMonths(s.monthDate, 1)
    return { start: startOfMonth(prev), end: endOfMonth(prev) }
  }
  return { start: null, end: null }
}

export const filterByRange = (tasks: Task[], start: Date | null, end: Date | null): Task[] => {
  if (!start && !end) return tasks
  return tasks.filter((t) => {
    const d = parseISO(t.start_date)
    if (start && isBefore(d, start)) return false
    if (end && isAfter(d, end)) return false
    return true
  })
}

export const filterExpensesByRange = (expenses: Expense[], start: Date | null, end: Date | null): Expense[] => {
  if (!start && !end) return expenses
  return expenses.filter((e) => {
    const d = parseISO(e.expense_date)
    if (start && isBefore(d, start)) return false
    if (end && isAfter(d, end)) return false
    return true
  })
}

export const calcDelta = (curr: number, prev: number): string | null => {
  if (prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}
