import { useQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import { addMonths, endOfMonth, format, isAfter, isBefore, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DatePicker } from '@/components/common/DatePicker'
import { ExpenseCategoryChart } from '@/features/dashboard/components/ExpenseCategoryChart'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { MonthlyChart } from '@/features/dashboard/components/MonthlyChart'
import { filterByRange, filterExpensesByRange, getRangeFromState, type PeriodMode } from '@/features/dashboard/utils'
import { fetchExpenseCategories } from '@/features/expense-categories/queries'
import { fetchExpenses } from '@/features/expenses/queries'
import { fetchTasks } from '@/features/tasks/queries'
import { STALE_FOREVER } from '@/lib/queryClient'
import { cn, formatCurrency } from '@/lib/utils'

export const Route = createLazyFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const [mode, setMode] = useState<PeriodMode>('month')
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [customStart, setCustomStart] = useState<string | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<string | undefined>(undefined)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  })
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
  })
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
    staleTime: STALE_FOREVER,
  })

  const anyLoading = isLoading || isLoadingExpenses

  const periodState = { mode, monthDate, customStart, customEnd }
  const { start, end } = getRangeFromState(periodState)

  const periodTasks = useMemo(() => filterByRange(tasks, start, end), [tasks, start, end])
  const periodExpenses = useMemo(() => filterExpensesByRange(expenses, start, end), [expenses, start, end])

  // KPI calculations
  const taskRevenue = periodTasks.reduce((s, t) => s + (t.received_amount || 0), 0)
  const expenseIncome = periodExpenses
    .filter((e) => e.entry_type === 'income')
    .reduce((s, e) => s + e.amount + (e.vat || 0), 0)
  const totalRevenue = taskRevenue + expenseIncome

  const taskCost = periodTasks.reduce((s, t) => s + (t.execution_cost || 0), 0)
  const expenseCost = periodExpenses.filter((e) => e.entry_type === 'expense').reduce((s, e) => s + e.amount, 0)
  const totalCost = taskCost + expenseCost

  const totalProfit = totalRevenue - totalCost

  // Monthly chart: 12 months, tasks + expenses combined
  const monthlyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(new Date(), 11 - i)
        const monthStart = startOfMonth(d)
        const monthEnd = endOfMonth(d)

        const monthTasks = tasks.filter((t) => {
          const td = parseISO(t.start_date)
          return !isBefore(td, monthStart) && !isAfter(td, monthEnd)
        })
        const monthExpenses = expenses.filter((e) => {
          const ed = parseISO(e.expense_date)
          return !isBefore(ed, monthStart) && !isAfter(ed, monthEnd)
        })

        const revenue =
          monthTasks.reduce((s, t) => s + (t.received_amount || 0), 0) +
          monthExpenses.filter((e) => e.entry_type === 'income').reduce((s, e) => s + e.amount + (e.vat || 0), 0)
        const cost =
          monthTasks.reduce((s, t) => s + (t.execution_cost || 0), 0) +
          monthExpenses.filter((e) => e.entry_type === 'expense').reduce((s, e) => s + e.amount, 0)
        const profit = revenue - cost

        const highlighted = start && end ? !isAfter(monthStart, end) && !isBefore(monthEnd, start) : false

        return { label: format(d, "M'월'"), revenue, cost, profit, highlighted }
      }),
    [tasks, expenses, start, end],
  )

  const highlightedMonths = monthlyData.filter((d) => d.highlighted)
  const highlightStart = highlightedMonths[0]?.label
  const highlightEnd = highlightedMonths[highlightedMonths.length - 1]?.label

  // Expense category breakdown (period filtered expenses, entry_type=expense only)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of periodExpenses.filter((e) => e.entry_type === 'expense')) {
      const key = e.category_id ?? '__none__'
      map.set(key, (map.get(key) ?? 0) + e.amount)
    }
    return [...map.entries()]
      .map(([key, amount]) => ({
        name: key === '__none__' ? '미분류' : (expenseCategories.find((c) => c.id === key)?.name ?? '미분류'),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodExpenses, expenseCategories])

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="max-w-screen-xl space-y-5">
        {/* Header + Period filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base text-gray-900 dark:text-gray-100">대시보드</span>
            <span className="text-gray-400 text-xs dark:text-gray-400">
              {start && end ? `${format(start, 'yy.MM.dd')} ~ ${format(end, 'yy.MM.dd')}` : '전체 기간'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 월 네비게이터 */}
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-md p-0.5 transition-colors',
                mode === 'month' ? 'bg-white shadow-sm dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setMonthDate((d) => subMonths(d, 1))
                  setMode('month')
                }}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('month')}
                className={cn(
                  'min-w-[84px] rounded px-2 py-1 text-center font-medium text-xs transition-colors',
                  mode === 'month' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400',
                )}
              >
                {format(monthDate, 'yyyy년 M월')}
              </button>
              <button
                type="button"
                disabled={!isBefore(startOfMonth(monthDate), startOfMonth(new Date()))}
                onClick={() => {
                  setMonthDate((d) => addMonths(d, 1))
                  setMode('month')
                }}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100"
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* 이번달 */}
            <button
              type="button"
              onClick={() => {
                setMonthDate(startOfMonth(new Date()))
                setMode('month')
              }}
              className="rounded-md bg-gray-100 px-3 py-1.5 font-medium text-gray-500 text-xs transition-all hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              이번달
            </button>

            {/* 전체 */}
            <button
              type="button"
              onClick={() => setMode('all')}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium text-xs transition-all',
                mode === 'all'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              전체
            </button>

            {/* 특정 기간 */}
            <div
              className={cn(
                'flex items-center gap-1 rounded-md p-0.5 transition-colors',
                mode === 'custom' ? 'bg-white shadow-sm ring-1 ring-gray-300 dark:bg-gray-700 dark:ring-gray-600' : '',
              )}
            >
              <DatePicker
                variant="filter"
                value={customStart}
                onChange={(v) => {
                  setCustomStart(v)
                  setMode('custom')
                }}
                placeholder="시작일"
              />
              <span className="text-gray-400 text-xs">~</span>
              <DatePicker
                variant="filter"
                value={customEnd}
                onChange={(v) => {
                  setCustomEnd(v)
                  setMode('custom')
                }}
                placeholder="종료일"
              />
            </div>
          </div>
        </div>

        {/* Row 1: 3 large KPI cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="총 매출"
            display={`+${formatCurrency(totalRevenue)}`}
            color="text-emerald-600 dark:text-emerald-400"
            isLoading={anyLoading}
          />
          <KpiCard
            label="총 지출"
            display={`-${formatCurrency(totalCost)}`}
            color="text-red-500 dark:text-red-400"
            isLoading={anyLoading}
          />
          <KpiCard
            label="순수익"
            display={formatCurrency(totalProfit)}
            color={totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
            isLoading={anyLoading}
          />
        </div>

        {/* Row 2: 수입 추이 차트 (2/3) + 지출 카테고리 (1/3) */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MonthlyChart data={monthlyData} highlightStart={highlightStart} highlightEnd={highlightEnd} />
          <ExpenseCategoryChart data={categoryData} isLoading={anyLoading} />
        </div>
      </div>
    </div>
  )
}
