import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { LandingPage } from './pages/public/LandingPage';
import { CustomerLoginPage } from './pages/auth/CustomerLoginPage';
import { CustomerRegistrationPage } from './pages/auth/CustomerRegistrationPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { AuthProvider } from './store/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { ManagePlans } from './pages/admin/ManagePlans';
import { CustomerList } from './pages/admin/customers/CustomerList';
import { CustomerProfile } from './pages/admin/customers/CustomerProfile';
import { AddModifyCustomer } from './pages/admin/customers/AddModifyCustomer';
import { AddModifyCustomerChit } from './pages/admin/customers/AddModifyCustomerChit';
import { ChitGroupList } from './pages/admin/chits/ChitGroupList';
import { ChitGroupDetail } from './pages/admin/chits/ChitGroupDetail';
import { Ledger } from './pages/admin/finance/Ledger';
import { Settings } from './pages/admin/management/Settings';
import { ReceiptEntry } from './pages/admin/finance/ReceiptEntry';
import { NonPayersReport } from './pages/admin/reports/NonPayersReport';
import { Payments } from './pages/admin/finance/Payments';
import { ManageBanks } from './pages/admin/finance/ManageBanks';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CustomerChitScheduleScreen } from './pages/admin/customers/CustomerChitScheduleScreen';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { purgeMockData } from './utils/cleanMockData';

// Purge any legacy mock customers and groups on startup
purgeMockData();

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
          </Route>
          
          <Route path="/customer-login" element={<CustomerLoginPage />} />
          <Route path="/register" element={<CustomerRegistrationPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/login" element={<Navigate to="/customer-login" replace />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/admin/manage-plans" element={<ManagePlans />} />
              <Route path="/admin/customers" element={<CustomerList />} />
              <Route path="/admin/customers/add" element={<AddModifyCustomer />} />
              <Route path="/admin/customers/approvals" element={<AddModifyCustomerChit />} />
              <Route path="/admin/customers/:id" element={<CustomerProfile />} />
              <Route path="/admin/customers/:id/schedule" element={<CustomerChitScheduleScreen />} />
              <Route path="/customer/chits/:id/schedule" element={<CustomerChitScheduleScreen />} />
              <Route path="/admin/chit-groups" element={<ChitGroupList />} />
              <Route path="/admin/chit-groups/:id" element={<ChitGroupDetail />} />
              <Route path="/admin/ledger" element={<Ledger />} />
              <Route path="/admin/payments" element={<Payments />} />
              <Route path="/admin/banks" element={<ManageBanks />} />

              <Route path="/admin/receipts" element={<ReceiptEntry />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/reports/non-payers" element={<NonPayersReport />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
