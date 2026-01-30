import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
    Paper,
    Stack,
    Button,
    CircularProgress,
    Chip,
    Grid,
    Container,
    IconButton,
    Backdrop,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material'
import {
    ArrowBack as ArrowBackIcon,
    PlayArrow as PlayArrowIcon,
    AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material'
import { endpointsAPI, testCasesAPI, testRunsAPI, fileAPI } from '../api/endpoints'
import TestReviewPanel from '../components/TestReviewPanel'
import AppButton from '../components/AppButton'

export default function TestPlanPage() {
    const { id } = useParams() // Endpoint ID
    const navigate = useNavigate()

    const [endpoint, setEndpoint] = useState(null)
    const [testCases, setTestCases] = useState([])
    const [testDataFiles, setTestDataFiles] = useState([])
    const [selectedTestData, setSelectedTestData] = useState('')
    const [loading, setLoading] = useState(true)
    const [executing, setExecuting] = useState(false)
    const [runResults, setRunResults] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!id) return
                const epResponse = await endpointsAPI.get(id)
                setEndpoint(epResponse.data)

                // Load Test Cases
                if (epResponse.data.project) {
                    const [tcResponse, tdResponse] = await Promise.all([
                        testCasesAPI.list(epResponse.data.project),
                        fileAPI.listTestData(epResponse.data.project)
                    ])
                    setTestCases(tcResponse.data)
                    setTestDataFiles(tdResponse.data)
                }
            } catch (error) {
                console.error('Failed to load data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id])

    const handleUpdateCase = (caseId, updates) => {
        setTestCases(prev => prev.map(tc => tc.id === caseId ? { ...tc, ...updates } : tc))
    }

    const handleDeleteCase = (caseId) => {
        setTestCases(prev => prev.filter(tc => tc.id !== caseId))
    }

    const handleBulkDeleteCases = (caseIds) => {
        setTestCases(prev => prev.filter(tc => !caseIds.includes(tc.id)))
    }

    const handleRunCases = async (caseIds = null) => {
        if (!endpoint) return
        setExecuting(true)
        try {
            const projectId = endpoint.project_id || endpoint.project
            const response = await testRunsAPI.execute(projectId, caseIds, selectedTestData)
            const runId = response.data.id

            // Navigate to Execution Live View
            navigate(`../execution/${runId}`)

        } catch (error) {
            console.error("Failed to execute run", error)
        } finally {
            setExecuting(false)
        }
    }

    const [logOpen, setLogOpen] = useState(false)
    const [logContent, setLogContent] = useState('')

    const handleViewLog = (content) => {
        setLogContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2))
        setLogOpen(true)
    }

    if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>

    return (
        <Box sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', bgcolor: 'background.default' }}>
            {/* Execution Overlay */}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column' }}
                open={executing}
            >
                <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
                <Typography variant="h5">Agents at Work...</Typography>
                <Typography variant="body1" sx={{ mt: 1, opacity: 0.8 }}>Spawning isolated browsers to execute your tests in parallel.</Typography>
            </Backdrop>

            {/* Log Viewer Dialog */}
            <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Agent Execution Log</DialogTitle>
                <DialogContent dividers>
                    <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.85rem' }}>
                        {logContent || "No logs available."}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <IconButton onClick={() => navigate(-1)}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Test Plan: {endpoint?.name || 'API Endpoint'}</Typography>
                        <Typography variant="body2" color="text.secondary">{endpoint?.method} {endpoint?.url}</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Test Data Selector */}
                    {testDataFiles.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id="test-data-select-label">Use Test Data</InputLabel>
                            <Select
                                labelId="test-data-select-label"
                                value={selectedTestData}
                                label="Use Test Data"
                                onChange={(e) => setSelectedTestData(e.target.value)}
                            >
                                <MenuItem value="">
                                    <em>None (Default Values)</em>
                                </MenuItem>
                                {testDataFiles.map((file) => (
                                    <MenuItem key={file.id} value={file.id}>
                                        {file.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {testCases.some(tc => tc.status === 'APPROVED') && (
                        <AppButton
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleRunCases(null)}
                            disabled={executing}
                        >
                            Run Approved Tests
                        </AppButton>
                    )}
                </Stack>

                <Grid container spacing={3}>
                    {/* Test Cases Review */}
                    <Grid item xs={12} lg={runResults ? 6 : 12}>
                        <Paper sx={{ p: 2 }}>
                            <TestReviewPanel
                                testCases={testCases}
                                onUpdateCase={handleUpdateCase}
                                onDeleteCase={handleDeleteCase}
                                onBulkDelete={handleBulkDeleteCases}
                                onRunCases={handleRunCases}
                            />
                        </Paper>
                    </Grid>

                    {/* Execution Results (only show if exists) */}
                    {runResults && (
                        <Grid item xs={12} lg={6}>
                            <Paper sx={{ p: 3, borderTop: '4px solid', borderColor: 'primary.main' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                    <Typography variant="h6">Execution Results</Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AutoAwesomeIcon />}
                                        onClick={handleDownloadReport}
                                    >
                                        Download PDF Report
                                    </Button>
                                </Stack>

                                <Stack spacing={2}>
                                    {runResults.map(res => (
                                        <Paper key={res.id} variant="outlined" sx={{ p: 2, borderLeft: '4px solid', borderColor: res.passed ? 'success.main' : 'error.main' }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box sx={{ flexGrow: 1, mr: 2 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {testCases.find(tc => tc.id === res.test_case)?.title}
                                                    </Typography>
                                                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">HTTP {res.status_code}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{res.duration_ms}ms</Typography>
                                                    </Stack>
                                                    {/* View Log Button */}
                                                    <Button
                                                        size="small"
                                                        sx={{ mt: 1, minWidth: 0, p: 0, textTransform: 'none' }}
                                                        onClick={() => handleViewLog(res.response_body?.agent_output || res.response_body)}
                                                    >
                                                        View Agent Logs
                                                    </Button>
                                                </Box>
                                                <Chip label={res.passed ? "PASS" : "FAIL"} color={res.passed ? "success" : "error"} size="small" />
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            </Container>
        </Box>
    )
}
