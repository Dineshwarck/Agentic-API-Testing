import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import {
    Container,
    Box,
    Typography,
    Breadcrumbs,
    Link,
    Paper,
    Grid,
    FormControl,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Stack,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { testRunsAPI, projectsAPI } from '../api/endpoints';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ReportsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');  // days

    // Report data
    const [historyData, setHistoryData] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [flakyTests, setFlakyTests] = useState([]);
    const [collectionHealth, setCollectionHealth] = useState([]);

    // Fetch workspace details
    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const response = await projectsAPI.get(id);
                setWorkspace(response);
            } catch (error) {
                console.error('Failed to fetch workspace:', error);
            }
        };
        fetchWorkspace();
    }, [id]);

    // Fetch report data
    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                // Calculate date range
                const endDate = new Date().toISOString();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(dateRange));
                const startDateStr = startDate.toISOString();

                // Fetch all reports in parallel using apiClient
                // apiClient baseURL is http://127.0.0.1:8001/api, so we just pass the relative path
                const [historyRes, trendsRes, flakyRes, collectionRes] = await Promise.all([
                    apiClient.get(`/reports/history?project_id=${id}&start_date=${startDateStr}&end_date=${endDate}`),
                    apiClient.get(`/reports/trends?project_id=${id}&start_date=${startDateStr}&end_date=${endDate}`),
                    apiClient.get(`/reports/flaky-tests?project_id=${id}&start_date=${startDateStr}&end_date=${endDate}`),
                    apiClient.get(`/reports/collection-health?project_id=${id}&start_date=${startDateStr}&end_date=${endDate}`)
                ]);

                setHistoryData(historyRes.data.runs || []);
                setTrendsData(trendsRes.data.trends || []);
                setFlakyTests(flakyRes.data.flaky_tests || []);
                setCollectionHealth(collectionRes.data.collections || []);
            } catch (error) {
                console.error('Failed to fetch reports:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchReports();
            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchReports, 30000);
            return () => clearInterval(interval);
        }
    }, [id, dateRange]);

    // ─── Export Handlers ──────────────────────────────────────────────

    const handleDownloadRunReport = async (runId) => {
        try {
            // Fetch detailed run data
            const [detailsRes, resultsRes] = await Promise.all([
                testRunsAPI.getDetails(runId),
                testRunsAPI.getResults(runId)
            ]);

            const run = detailsRes.data;
            const results = resultsRes.data;
            const projectName = workspace?.name || 'Project';

            const doc = new jsPDF();
            const now = new Date(run.started_at).toLocaleString();

            // 1. Professional Header
            doc.setFillColor(33, 150, 243); // Material Blue
            doc.rect(0, 0, 210, 40, 'F');

            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text('Test Execution Report', 14, 25);

            doc.setFontSize(10);
            doc.text(`${projectName}  |  ${now}`, 14, 33);

            let y = 50;

            // 2. Executive Summary (AI Box)
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Executive Summary (AI)', 14, y);
            y += 8;

            doc.setFillColor(245, 247, 250);
            doc.setDrawColor(200, 200, 200);

            // Calculate summary height
            const summaryText = run.summary || "No automated summary available for this run.";
            const splitSummary = doc.splitTextToSize(summaryText, 180);
            const boxHeight = (splitSummary.length * 5) + 10;

            doc.rect(14, y, 182, boxHeight, 'FD');
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text(splitSummary, 20, y + 8);

            y += boxHeight + 15;

            // 3. Metadata Table (Quick Info)
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Run Details', 14, y);
            y += 5;

            // Helper: track cursor Y via didDrawPage hook
            let cursorY = 0;
            const trackY = { didDrawPage: (data) => { cursorY = data.cursor.y; } };

            autoTable(doc, {
                startY: y,
                body: [
                    ['Run ID:', run.id],
                    ['Status:', { content: run.status, styles: { fontStyle: 'bold', textColor: run.status === 'COMPLETED' ? [76, 175, 80] : [244, 67, 54] } }],
                    ['Date:', now],
                    ['Total Tests:', results.length.toString()],
                    ['Passed:', results.filter(r => r.passed).length.toString()],
                    ['Failed:', results.filter(r => !r.passed).length.toString()],
                ],
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
                ...trackY
            });

            y = cursorY + 15;

            // 4. Detailed Results
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Detailed Results', 14, y);
            y += 5;

            autoTable(doc, {
                startY: y,
                head: [['Test Case', 'Status', 'HTTP Code', 'Duration (ms)']],
                body: results.map(res => [
                    {
                        content: `${res.test_case.title}\n${res.test_case.description || ''}`,
                        styles: { fontSize: 8 }
                    },
                    {
                        content: res.passed ? 'PASS' : 'FAIL',
                        styles: {
                            textColor: res.passed ? [76, 175, 80] : [244, 67, 54],
                            fontStyle: 'bold'
                        }
                    },
                    res.status_code || '-',
                    res.duration_ms || 0
                ]),
                headStyles: { fillColor: [44, 62, 80], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                styles: { cellPadding: 4, valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' }
                }
            });

            doc.save(`RunReport_${run.id.substring(0, 8)}.pdf`);
        } catch (error) {
            console.error('Failed to download report:', error);
            // TODO: Add notification toast here
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const projectName = workspace?.name || 'Project';
        const now = new Date().toLocaleDateString();

        // 1. Modern Branding Header
        doc.setFillColor(44, 62, 80); // Darker professional blue
        doc.rect(0, 0, 210, 45, 'F');

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Project Analytics Report', 14, 25);

        doc.setFontSize(10);
        doc.text(`Project: ${projectName}`, 14, 34);
        doc.text(`Generated: ${now}  |  Date Range: Last ${dateRange} days`, 14, 39);

        let y = 55;
        let cursorY = 0;
        const trackY = { didDrawPage: (data) => { cursorY = data.cursor.y; } };

        const addHeader = (title) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setTextColor(33, 150, 243);
            doc.text(title.toUpperCase(), 14, y);
            doc.setDrawColor(230);
            doc.line(14, y + 2, 196, y + 2);
            y += 10;
        };

        // Section 1: Execution History Summary
        addHeader('Execution History Summary');
        if (historyData.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Run ID', 'Status', 'Total', 'Passed', 'Failed', 'Pass Rate', 'Date']],
                body: historyData.map(run => [
                    run.id.substring(0, 8) + '...',
                    run.status,
                    run.total_tests || 0,
                    run.passed || 0,
                    run.failed || 0,
                    `${run.pass_rate}%`,
                    new Date(run.executed_at).toLocaleDateString()
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [44, 62, 80], textColor: 255 },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                ...trackY,
            });
            y = cursorY + 15;
        }

        // Section 2: Collection Health
        addHeader('Collection Health Index');
        if (collectionHealth.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Collection', 'Total Tests', 'Passed', 'Failed', 'Pass Rate']],
                body: collectionHealth.map(c => [
                    c.collection_name,
                    c.total_tests || 0,
                    c.passed || 0,
                    c.failed || 0,
                    `${(c.pass_rate || 0).toFixed(1)}%`
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [76, 175, 80], textColor: 255 },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                ...trackY,
            });
            y = cursorY + 15;
        }

        // Section 3: Flaky Test Intel
        if (flakyTests.length > 0) {
            addHeader('Flaky Test Intelligence');
            autoTable(doc, {
                startY: y,
                head: [['Test Name', 'Flake Risk', 'Stability Impact', 'Total Runs']],
                body: flakyTests.map(t => [
                    t.test_name,
                    `${t.flake_rate}%`,
                    t.flake_rate > 50 ? 'HIGH' : 'MEDIUM',
                    t.total_runs
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [244, 67, 54], textColor: 255 },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                ...trackY,
            });
        }

        doc.save(`${projectName}_Analytics_${now.replace(/\//g, '-')}.pdf`);
    };

    const handleExportExcel = () => {
        const projectName = workspace?.name || 'Project';
        const wb = XLSX.utils.book_new();

        // Sheet 1: Execution History
        const historySheet = XLSX.utils.json_to_sheet(
            historyData.map(run => ({
                'Run ID': run.id,
                'Status': run.status,
                'Total Tests': run.total_tests || 0,
                'Passed': run.passed || 0,
                'Failed': run.failed || 0,
                'Pass Rate': run.total_tests > 0 ? `${((run.passed / run.total_tests) * 100).toFixed(1)}%` : 'N/A',
                'Date': run.created_at ? new Date(run.created_at).toLocaleDateString() : 'N/A',
            }))
        );
        XLSX.utils.book_append_sheet(wb, historySheet, 'Execution History');

        // Sheet 2: Trends
        const trendsSheet = XLSX.utils.json_to_sheet(
            trendsData.map(t => ({
                'Date': t.date,
                'Total Tests': t.total_tests || 0,
                'Passed': t.passed || 0,
                'Failed': t.failed || 0,
                'Avg Duration (s)': (t.avg_duration || 0).toFixed(2),
            }))
        );
        XLSX.utils.book_append_sheet(wb, trendsSheet, 'Trends');

        // Sheet 3: Collection Health
        const healthSheet = XLSX.utils.json_to_sheet(
            collectionHealth.map(c => ({
                'Collection': c.collection_name,
                'Total Tests': c.total_tests || 0,
                'Passed': c.passed || 0,
                'Failed': c.failed || 0,
                'Pass Rate (%)': (c.pass_rate || 0).toFixed(1),
            }))
        );
        XLSX.utils.book_append_sheet(wb, healthSheet, 'Collection Health');

        // Sheet 4: Flaky Tests
        if (flakyTests.length > 0) {
            const flakySheet = XLSX.utils.json_to_sheet(
                flakyTests.map(t => ({
                    'Test Name': t.test_name,
                    'Flake Rate (%)': t.flake_rate,
                    'Total Runs': t.total_runs,
                }))
            );
            XLSX.utils.book_append_sheet(wb, flakySheet, 'Flaky Tests');
        }

        // Generate and download
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${projectName}_TestReport.xlsx`);
    };

    // ─── Chart Data ───────────────────────────────────────────────────

    // Chart data preparations
    const passFaillTrendData = {
        labels: trendsData.map(t => t.date),
        datasets: [
            {
                label: 'Passed',
                data: trendsData.map(t => t.passed),
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Failed',
                data: trendsData.map(t => t.failed),
                borderColor: '#f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Total',
                data: trendsData.map(t => t.total_tests),
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: false,
                tension: 0.4,
                borderDash: [5, 5]
            }
        ]
    };

    const collectionHealthPieData = {
        labels: collectionHealth.map(c => c.collection_name),
        datasets: [
            {
                label: 'Pass Rate',
                data: collectionHealth.map(c => c.pass_rate),
                backgroundColor: [
                    '#4caf50',
                    '#2196f3',
                    '#ff9800',
                    '#9c27b0',
                    '#00bcd4',
                    '#ffeb3b'
                ],
                borderWidth: 1
            }
        ]
    };

    const executionDurationData = {
        labels: trendsData.map(t => t.date),
        datasets: [
            {
                label: 'Avg Duration (seconds)',
                data: trendsData.map(t => t.avg_duration),
                backgroundColor: '#2196f3',
                borderColor: '#1976d2',
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            }
        }
    };

    if (!workspace) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link
                    component="button"
                    variant="body1"
                    onClick={() => navigate('/projects')}
                    sx={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                    Workspaces
                </Link>
                <Link
                    component="button"
                    variant="body1"
                    onClick={() => navigate(`/projects/${id}`)}
                    sx={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                    {workspace.name}
                </Link>
                <Typography color="text.primary">Reports</Typography>
            </Breadcrumbs>

            {/* Header with Date Range Picker */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Reports & Analytics
                </Typography>
                <FormControl sx={{ minWidth: 200 }}>
                    <Select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        size="small"
                    >
                        <MenuItem value="7">Last 7 Days</MenuItem>
                        <MenuItem value="30">Last 30 Days</MenuItem>
                        <MenuItem value="90">Last 3 Months</MenuItem>
                        <MenuItem value="180">Last 6 Months</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* First Row: Pass/Fail Trend + Collection Health */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={8}>
                            <Paper sx={{ p: 3, height: 400 }}>
                                <Typography variant="h6" gutterBottom>
                                    Pass/Fail Trend
                                </Typography>
                                {trendsData.length > 0 ? (
                                    <Box sx={{ height: 330 }}>
                                        <Line data={passFaillTrendData} options={chartOptions} />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 330 }}>
                                        <Typography color="text.secondary">No trend data available</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 3, height: 400 }}>
                                <Typography variant="h6" gutterBottom>
                                    Collection Health
                                </Typography>
                                {collectionHealth.length > 0 ? (
                                    <Box sx={{ height: 330, display: 'flex', justifyContent: 'center' }}>
                                        <Pie data={collectionHealthPieData} options={chartOptions} />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 330 }}>
                                        <Typography color="text.secondary">No collection data available</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Second Row: Execution Duration + Flaky Tests */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: 400 }}>
                                <Typography variant="h6" gutterBottom>
                                    Execution Duration
                                </Typography>
                                {trendsData.length > 0 ? (
                                    <Box sx={{ height: 330 }}>
                                        <Bar data={executionDurationData} options={chartOptions} />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 330 }}>
                                        <Typography color="text.secondary">No duration data available</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: 400, overflow: 'auto' }}>
                                <Typography variant="h6" gutterBottom>
                                    Flaky Tests
                                </Typography>
                                {flakyTests.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Test Name</TableCell>
                                                    <TableCell align="right">Flake Rate</TableCell>
                                                    <TableCell align="right">Total Runs</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {flakyTests.map((test) => (
                                                    <TableRow
                                                        key={test.test_case_id}
                                                        hover
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => {
                                                            // TODO: Navigate to test case details
                                                            console.log('Navigate to test:', test.test_case_id);
                                                        }}
                                                    >
                                                        <TableCell>{test.test_name}</TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={`${test.flake_rate}%`}
                                                                color={test.flake_rate > 30 ? 'error' : 'warning'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">{test.total_runs}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 330 }}>
                                        <Typography color="text.secondary">No flaky tests detected</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Third Row: Execution History */}
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Execution History
                                </Typography>
                                {historyData.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Run ID</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell align="right">Total Tests</TableCell>
                                                    <TableCell align="right">Passed</TableCell>
                                                    <TableCell align="right">Failed</TableCell>
                                                    <TableCell align="right">Pass Rate</TableCell>
                                                    <TableCell align="right">Date</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {historyData.map((run) => (
                                                    <TableRow key={run.id} hover>
                                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                                            {run.id.substring(0, 8)}...
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={run.status}
                                                                color={
                                                                    run.status === 'COMPLETED' ? 'success' :
                                                                        run.status === 'FAILED' ? 'error' : 'warning'
                                                                }
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">{run.total_tests}</TableCell>
                                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                            {run.passed}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                                            {run.failed}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                                <Typography variant="body2">{run.pass_rate}%</Typography>
                                                                <Box sx={{ width: 50, height: 4, bgcolor: 'divider', borderRadius: 2 }}>
                                                                    <Box sx={{ width: `${run.pass_rate}%`, height: '100%', bgcolor: run.pass_rate > 70 ? 'success.main' : 'warning.main', borderRadius: 2 }} />
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {new Date(run.executed_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                size="small"
                                                                startIcon={<DownloadIcon />}
                                                                onClick={() => handleDownloadRunReport(run.id)}
                                                            >
                                                                Report
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                                        <Typography color="text.secondary">No execution history found</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Export Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<PdfIcon />}
                            onClick={handleExportPDF}
                        >
                            Export to PDF
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<ExcelIcon />}
                            onClick={handleExportExcel}
                        >
                            Export to Excel
                        </Button>
                    </Box>
                </>
            )}
        </Container>
    );
};

export default ReportsPage;
