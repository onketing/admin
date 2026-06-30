import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'
import { ExpenseLedgerPage } from '@/features/expenses/ExpenseLedgerPage'

export const Route = createLazyFileRoute('/_authed/income/')({
  component: IncomePage,
})

const routeApi = getRouteApi('/_authed/income/')

function IncomePage() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  return (
    <ExpenseLedgerPage
      entryType="income"
      search={search}
      update={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })}
    />
  )
}
