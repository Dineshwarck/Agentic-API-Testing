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

                    {/* Export Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button variant="outlined" color="primary" disabled>
                            Export to PDF
                        </Button>
                        <Button variant="outlined" color="primary" disabled>
                            Export to Excel
                        </Button>
                    </Box>
                </>
            )}
        </Container>
    );
};

export default ReportsPage;
