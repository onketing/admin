import { useMemo } from 'react'
import type { EntryType, Expense, ExpenseRow } from './types'

type Filters = {
  searchText: string
  spenderFilter: string
  dateFrom: string | undefined
  dateTo: string | undefined
  entryType: EntryType
}

type UseExpenseFiltersResult = {
  allRows: ExpenseRow[]
  filteredRows: ExpenseRow[]
  sortedRows: ExpenseRow[]
  summary: {
    total: number
    totalVat: number
    grandTotal: number
  }
}

export const useExpenseFilters = (expenses: Expense[], filters: Filters): UseExpenseFiltersResult => {
  const { searchText, spenderFilter, dateFrom, dateTo, entryType } = filters

  const allRows: ExpenseRow[] = useMemo(
    () =>
      expenses
        .filter((expense) => expense.entry_type === entryType)
        .map((expense) => ({
          id: expense.id,
          type: expense.entry_type,
          description: expense.description,
          amount: expense.amount,
          vat: expense.vat,
          date: expense.expense_date,
          spender: expense.spender_name,
          spender_member_id: expense.spender_member_id,
          category_id: expense.category_id,
          editable: true,
          attachment_count: expense.attachment_count,
          attachments: expense.attachments,
        })),
    [expenses, entryType],
  )

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const matchSearch = searchText ? row.description.toLowerCase().includes(searchText.toLowerCase()) : true
      const matchSpender = spenderFilter && spenderFilter !== 'all' ? row.spender_member_id === spenderFilter : true
      const matchDateFrom = dateFrom ? row.date >= dateFrom : true
      const matchDateTo = dateTo ? row.date <= dateTo : true
      return matchSearch && matchSpender && matchDateFrom && matchDateTo
    })
  }, [allRows, searchText, spenderFilter, dateFrom, dateTo])

  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [filteredRows],
  )

  const summary = useMemo(() => {
    const total = filteredRows.reduce((sum, r) => sum + r.amount, 0)
    const totalVat = filteredRows.reduce((sum, r) => sum + (r.vat ?? 0), 0)
    return { total, totalVat, grandTotal: total + totalVat }
  }, [filteredRows])

  return { allRows, filteredRows, sortedRows, summary }
}
