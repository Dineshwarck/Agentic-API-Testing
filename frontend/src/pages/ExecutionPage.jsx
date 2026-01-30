import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
    Paper,
    Stack,
    Button,
    Container,
    IconButton,
    Grid,
    CircularProgress,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material'
import {
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Pending as PendingIcon,
    PlayArrow as PlayArrowIcon,
    Terminal as TerminalIcon,
} from '@mui/icons-material'
import DownloadIcon from '@mui/icons-material/Download'
import { endpointsAPI, testRunsAPI } from '../api/endpoints'

function ExecutionPage() {
    const { id, runId } = useParams() // id=EndpointID (optional context), runId=RunID
    const navigate = useNavigate()

    const [status, setStatus] = useState('CONNECTING') // CONNECTING, RUNNING, COMPLETED
    const [logs, setLogs] = useState([])
    const [testCases, setTestCases] = useState([])
    const [projectId, setProjectId] = useState(null)

    const logsEndRef = useRef(null)

    // 1. Load Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                let pid = null

                // Strategy A: Get Project from Endpoint Context (if URL has :id)
                if (id) {
                    try {
                        const ep = await endpointsAPI.get(id)
                        pid = ep.data.project_id || ep.data.project
                    } catch (err) {
                        console.warn("Failed to fetch endpoint details", err)
                    }
                }

                // Strategy B: Get Project from Run Details (Fallback)
                if (!pid && runId) {
                    try {
                        const runDetails = await testRunsAPI.getDetails(runId)
                        pid = runDetails.data.project
                    } catch (err) {
                        console.warn("Failed to fetch run details", err)
                    }
                }

                if (pid) setProjectId(pid)

                // Get Run Results (Initial Placeholders)
                const res = await testRunsAPI.getResults(runId)
                if (res.data && Array.isArray(res.data)) {
                    setTestCases(res.data.map(r => ({
                        id: r.test_case,
                        title: `Test Case ${r.test_case.slice(0, 4)}...`,
                        status: r.status,
                        resultId: r.id
                    })))
                } else if (res.data && Array.isArray(res.data.results)) { // Handle paginated response if any
                    setTestCases(res.data.results.map(r => ({
                        id: r.test_case,
                        title: `Test Case ${r.test_case.slice(0, 4)}...`,
                        status: r.status,
                        resultId: r.id
                    })))
                } else {
                    console.warn("getResults returned unexpected format:", res.data)
                }
            } catch (e) {
                console.error("Setup failed", e)
            }
        }
        if (runId) fetchData()
    }, [id, runId])

    // 2. Connect SSE
    useEffect(() => {
        if (!projectId || !runId) return

        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8001/api'}/projects/${projectId}/runs/${runId}/stream`
        console.log("Connecting SSE:", url)

        const evtSource = new EventSource(url)

        evtSource.onopen = () => {
            setStatus("RUNNING")
            setLogs(prev => [...prev, { message: "🔌 Connected to live stream..." }])
        }

        evtSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)

                if (data.type === 'log') {
                    setLogs(prev => [...prev, data])
                }
                else if (data.type === 'result') {
                    setTestCases(prev => prev.map(tc => {
                        // Match by Result ID (preferred) or Test Case ID (fallback)
                        const match = data.result_id
                            ? tc.resultId === data.result_id
                            : tc.id === data.test_case_id

                        return match
                            ? { ...tc, status: data.status }
                            : tc
                    }))

                    setLogs(prev => [...prev, { message: `🏁 Test Case Completed: ${data.status}` }])
                }
                else if (data.type === 'start') {
                    setLogs(prev => [...prev, { message: "🚀 Execution Started" }])
                }
                else if (data.type === 'end') {
                    setStatus("COMPLETED")
                    setLogs(prev => [...prev, { message: "✨ All Tests Completed." }])
                    evtSource.close()
                }

                logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })

            } catch (err) {
                console.warn("Parse error", err)
            }
        }

        evtSource.onerror = (err) => {
            console.error("SSE Error", err)
            // if (evtSource.readyState === EventSource.CLOSED) {
            //      setStatus("DISCONNECTED")
            // }
        }

        return () => {
            evtSource.close()
        }
    }, [projectId, runId])

    const handleDownloadReport = async () => {
        try {
            const response = await testRunsAPI.downloadReport(runId)

            // Create Blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `run_report_${runId.slice(0, 8)}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error("Failed to download report", error)
        }
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', color: '#eee' }}>
            {/* Header */}
            <Paper square sx={{ p: 2, bgcolor: '#252526', borderBottom: '1px solid #333', color: 'white' }}>
                <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={() => navigate(-1)} sx={{ color: 'white' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Stack>
                            <Typography variant="h6">Test Execution #{runId?.slice(0, 8)}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status === 'RUNNING' ? '#27ae60' : '#7f8c8d', boxShadow: status === 'RUNNING' ? '0 0 5px #2ada71' : 'none' }} />
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>{status}</Typography>
                            </Stack>
                        </Stack>
                    </Stack>

                    {status === 'COMPLETED' && (
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadReport}
                            size="small"
                        >
                            Download Report
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* Main Content Split */}
            <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {/* Left: Test Cases List */}
                <Grid item xs={3} sx={{ borderRight: '1px solid #333', overflowY: 'auto', bgcolor: '#252526' }}>
                    <List>
                        {testCases.map((tc, idx) => (
                            <ListItem key={tc.id || idx} divider sx={{ borderColor: '#333' }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    {tc.status === 'RUNNING' && <CircularProgress size={16} sx={{ color: '#3498db' }} />}
                                    {tc.status === 'PASSED' && <CheckCircleIcon fontSize="small" sx={{ color: '#27ae60' }} />}
                                    {tc.status === 'FAILED' && <ErrorIcon fontSize="small" sx={{ color: '#c0392b' }} />}
                                    {tc.status === 'PENDING' && <PendingIcon fontSize="small" sx={{ color: '#7f8c8d' }} />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={tc.title || `Test Case ${tc.id.slice(0, 8)}`}
                                    secondaryTypographyProps={{ sx: { color: '#888', fontSize: '0.75rem' } }}
                                    secondary={tc.status}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Grid>

                {/* Right: Console Log */}
                <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1, bgcolor: '#333', borderBottom: '1px solid #444' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TerminalIcon fontSize="small" />
                            <Typography variant="caption" fontWeight="bold">Live Agent Console</Typography>
                        </Stack>
                    </Box>
                    <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#d4d4d4' }}>
                        {logs.map((log, i) => (
                            <Box key={i} sx={{ mb: 1, opacity: 0.9 }}>
                                {log.message}
                            </Box>
                        ))}
                        <div ref={logsEndRef} />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    )
}

export default ExecutionPage
