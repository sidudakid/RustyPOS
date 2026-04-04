import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './ui/AppShell'
import { CustomerPage } from './pages/CustomerPage'
import { CustomerOrderPage } from './pages/CustomerOrderPage'
import { KitchenPage } from './pages/KitchenPage'
import { AdminPage } from './pages/AdminPage'
import { ErrorPage } from './ErrorPage'
import { CafeSettingsProvider } from './cafeSettings'
import './styles.css'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <CustomerPage /> },
      { path: 't/:token', element: <CustomerPage /> },
      { path: 't/:token/order/:orderId', element: <CustomerOrderPage /> },
      { path: 'kitchen', element: <KitchenPage /> },
      { path: 'admin/orders', element: <AdminPage /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <CafeSettingsProvider>
      <RouterProvider router={router} />
    </CafeSettingsProvider>
  </QueryClientProvider>,
)
