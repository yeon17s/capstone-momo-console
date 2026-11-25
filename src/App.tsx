import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ApiProvider } from './context/ApiContext'
import { ComparisonProvider } from './context/ComparisonContext'
import { ModelProvider } from './context/ModelContext'
import { SourceProvider } from './context/SourceContext'
import { AppLayout } from './components/layout/AppLayout'
import DashboardPage from './pages/dashboard'
import HistoryPage from './pages/history'
import SettingPage from './pages/setting'

export default function App() {
  return (
    <SourceProvider>
      <ApiProvider>
        <ModelProvider>
          <ComparisonProvider>
            <HashRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="settings" element={<SettingPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </ComparisonProvider>
        </ModelProvider>
      </ApiProvider>
    </SourceProvider>
  )
}
