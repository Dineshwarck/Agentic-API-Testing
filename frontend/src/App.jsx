import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProjectsPage from './pages/ProjectsPage'
import TestingWorkbenchPage from './pages/TestingWorkbenchPage'
import TestPlanPage from './pages/TestPlanPage'
import ExecutionPage from './pages/ExecutionPage'
import SettingsPage from './pages/SettingsPage'
import WorkspaceConfigPage from './pages/WorkspaceConfigPage'
import CollectionsExplorerPage from './pages/CollectionsExplorerPage'
import TestCaseReviewPage from './pages/TestCaseReviewPage'
import TestCaseReviewDemo from './pages/TestCaseReviewDemo'
import ReportsPage from './pages/ReportsPage'
import TestDataPage from './pages/TestDataPage'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/projects" replace />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="testing-workbench/:id" element={<TestingWorkbenchPage />} />
                <Route path="testing-workbench/:id/plan" element={<TestPlanPage />} />
                <Route path="testing-workbench/:id/execution/:runId" element={<ExecutionPage />} />
                <Route path="execution/:runId" element={<ExecutionPage />} />

                {/* New Routes */}
                <Route path="projects/:id/config" element={<WorkspaceConfigPage />} />
                <Route path="projects/:id/collections" element={<CollectionsExplorerPage />} />
                <Route path="projects/:id/review" element={<TestCaseReviewPage />} />
                <Route path="projects/:id/reports" element={<ReportsPage />} />
                <Route path="projects/:id/test-data" element={<TestDataPage />} />

                {/* Demo Route */}
                <Route path="demo/test-case-review" element={<TestCaseReviewDemo />} />
            </Route>
        </Routes>
    )
}

export default App
