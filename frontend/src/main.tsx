import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from './ui/AppShell'
import { CustomerPage } from './pages/CustomerPage'
import { CustomerLandingPage } from './pages/CustomerLandingPage'
import { CustomerOrderPage } from './pages/CustomerOrderPage'
import { CustomerPaymentPage } from './pages/CustomerPaymentPage'
import { KitchenPage } from './pages/KitchenPage'
import { StaffPage } from './pages/StaffPage'
import { AdminPage } from './pages/AdminPage'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { OperatorHubPage } from './operatorAccess'
import { AdminMenuPage } from './pages/admin/AdminMenuPage'
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
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
      { index: true, element: <CustomerLandingPage /> },
      { path: 't/:token', element: <CustomerPage /> },
      { path: 't/:token/order/:orderId', element: <CustomerOrderPage /> },
      { path: 'pay/:sessionToken', element: <CustomerPaymentPage /> },
      { path: 'ops', element: <OperatorHubPage /> },
      { path: 'kitchen', element: <KitchenPage /> },
      { path: 'staff', element: <StaffPage /> },
      {
        path: 'admin',
        element: <AdminPage />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: 'orders', element: <AdminOverviewPage /> },
          { path: 'menu', element: <AdminMenuPage /> },
          { path: 'inventory', element: <AdminInventoryPage /> },
          { path: 'analytics', element: <AdminAnalyticsPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
        ],
      },
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
