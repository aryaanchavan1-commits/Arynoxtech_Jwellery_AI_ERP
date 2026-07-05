import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, AppContext } from './contexts/AppContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MastersModule from './components/Masters/MastersModule';
import GoldRatesModule from './components/GoldRates/GoldRatesModule';
import SalesModule from './components/Sales/SalesModule';
import PurchaseModule from './components/Purchase/PurchaseModule';
import KaragirModule from './components/Karagir/KaragirModule';
import StockModule from './components/Stock/StockModule';
import AccountingModule from './components/Accounting/AccountingModule';
import GoldSchemeModule from './components/GoldScheme/GoldSchemeModule';
import HRModule from './components/HR/HRModule';
import ReportsModule from './components/Reports/ReportsModule';
import AIAssistant from './components/AIAssistant/AIAssistant';
import SettingsPage from './components/Settings/SettingsPage';
import BarcodeDesigner from './components/Printing/BarcodeDesigner';
import BillsList from './components/Printing/BillsList';
import GSTModule from './components/GST/GSTModule';
import GirviModule from './components/Girvi/GirviModule';
import JobTrackingModule from './components/Jobs/JobTrackingModule';
import QuotationModule from './components/Quotations/QuotationModule';
import CRMModule from './components/CRM/CRMModule';
import AlertsModule from './components/Alerts/AlertsModule';
import PermissionsModule from './components/Permissions/PermissionsModule';
import ImportWizard from './components/Import/ImportWizard';
import HelpModule from './components/Help/HelpModule';
import SyncPanel from './components/Sync/SyncPanel';
import PaperSetup from './components/Settings/PaperSetup';
import './styles.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = React.useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="masters/*" element={<MastersModule />} />
              <Route path="gold-rates/*" element={<GoldRatesModule />} />
              <Route path="sales/*" element={<SalesModule />} />
              <Route path="purchase/*" element={<PurchaseModule />} />
              <Route path="karagir/*" element={<KaragirModule />} />
              <Route path="stock/*" element={<StockModule />} />
              <Route path="accounting/*" element={<AccountingModule />} />
              <Route path="gold-scheme/*" element={<GoldSchemeModule />} />
              <Route path="hr/*" element={<HRModule />} />
              <Route path="reports/*" element={<ReportsModule />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="barcode-designer" element={<BarcodeDesigner />} />
              <Route path="all-bills" element={<BillsList />} />
              <Route path="gst/*" element={<GSTModule />} />
              <Route path="girvi/*" element={<GirviModule />} />
              <Route path="jobs/*" element={<JobTrackingModule />} />
              <Route path="quotations/*" element={<QuotationModule />} />
              <Route path="crm/*" element={<CRMModule />} />
              <Route path="alerts/*" element={<AlertsModule />} />
              <Route path="permissions/*" element={<PermissionsModule />} />
              <Route path="data-import" element={<ImportWizard />} />
              <Route path="sync" element={<SyncPanel />} />
              <Route path="help" element={<HelpModule />} />
              <Route path="settings/*" element={<SettingsPage />} />
              <Route path="paper-setup" element={<PaperSetup />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </AppProvider>
  );
}
