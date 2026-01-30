import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    Breadcrumbs,
    Link,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Stack,
    Checkbox,
    FormControlLabel,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Alert,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    PlayArrow as PlayArrowIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    Add as AddIcon,
    SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import TestCaseReviewCard from '../components/TestCaseReviewCard';
import ManualTestCreatorDrawer from '../components/ManualTestCreatorDrawer';
import AiTestGeneratorDrawer from '../components/AiTestGeneratorDrawer';
import BulkExecutionProgressDialog from '../components/BulkExecutionProgressDialog';
import { testCasesAPI, projectsAPI, testRunsAPI } from '../api/endpoints';
import { enrichTestCasesWithCategories } from '../utils/mockCollections';

/**
 * TestCaseReviewPage Component
 * 
 * Dedicated page for reviewing and approving/rejecting test cases
 * Groups test cases by endpoint for easier review
 * 
 * Route: /workspaces/:id/review
 */
const TestCaseReviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [testCases, setTestCases] = useState([]);
    const [filteredTestCases, setFilteredTestCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('DRAFT');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);

    // Execution state
    const [executing, setExecuting] = useState(false);
    const [executionResults, setExecutionResults] = useState(null);
    const [showResults, setShowResults] = useState(false);

    // Drawer state
    const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
    const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

    // Bulk execution state
    const [bulkRunId, setBulkRunId] = useState(null);
    const [bulkProgressDialogOpen, setBulkProgressDialogOpen] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch workspace
                const workspaceResponse = await projectsAPI.get(id);
                setWorkspace(workspaceResponse.data);

                // Fetch test cases from API
                try {
                    const testCasesResponse = await testCasesAPI.list(id);
                    // Handle both list and object response (just in case future pagination)
                    const items = Array.isArray(testCasesResponse.data)
                        ? testCasesResponse.data
                        : (testCasesResponse.data.items || []);

                    setTestCases(items);
                } catch (tcError) {
                    console.error("Failed to fetch test cases:", tcError);
                    // Don't block page load, just show empty
                    setTestCases([]);
                }

            } catch (err) {
                setError('Failed to load test cases');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Apply filters
    useEffect(() => {
        let filtered = testCases;

        // Status filter
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(tc => tc.status === statusFilter);
        }

        // Category filter
        if (categoryFilter !== 'ALL') {
            filtered = filtered.filter(tc => tc.category === categoryFilter);
        }

        setFilteredTestCases(filtered);
        setSelectedIds(new Set()); // Clear selection when filters change
        setSelectAll(false);
    }, [testCases, statusFilter, categoryFilter]);

    // Group test cases by endpoint
    const groupedTestCases = filteredTestCases.reduce((acc, testCase) => {
        const endpointId = testCase.endpoint;
        if (!acc[endpointId]) {
            acc[endpointId] = {
                endpoint: testCase.endpoint_name || `Endpoint ${endpointId}`,
                testCases: [],
            };
        }
        acc[endpointId].testCases.push(testCase);
        return acc;
    }, {});

    // Handle approve
    const handleApprove = async (testCaseId) => {
        try {
            await testCasesAPI.update(testCaseId, { status: 'APPROVED' });

            // Update local state
            setTestCases(prev =>
                prev.map(tc => tc.id === testCaseId ? { ...tc, status: 'APPROVED' } : tc)
            );
        } catch (err) {
            console.error('Failed to approve test case:', err);
            alert('Failed to approve test case');
        }
    };

    // Handle reject
    const handleReject = async (testCaseId, reason) => {
        try {
            await testCasesAPI.update(testCaseId, {
                status: 'REJECTED',
                rejection_reason: reason,
            });

            // Update local state
            setTestCases(prev =>
                prev.map(tc =>
                    tc.id === testCaseId
                        ? { ...tc, status: 'REJECTED', rejection_reason: reason }
                        : tc
                )
            );
        } catch (err) {
            console.error('Failed to reject test case:', err);
            alert('Failed to reject test case');
        }
    };

    // Handle edit
    const handleEdit = async (testCaseId, updates) => {
        try {
            await testCasesAPI.update(testCaseId, updates);

            // Update local state
            setTestCases(prev =>
                prev.map(tc =>
                    tc.id === testCaseId
                        ? { ...tc, ...updates }
                        : tc
                )
            );
        } catch (err) {
            console.error('Failed to update test case:', err);
            alert('Failed to update test case');
        }
    };

    // Handle bulk execution
    const handleRunAllTests = async () => {
        try {
            const response = await fetch(`http://localhost:8001/api/projects/${id}/run-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parallel: true,
                    max_workers: 5
                })
            });

            const bulkRun = await response.json();
            setBulkRunId(bulkRun.id);
            setBulkProgressDialogOpen(true);
        } catch (error) {
            console.error('Failed to start bulk execution:', error);
            alert('Failed to start test execution. Please try again.');
        }
    };

    // Toggle selection
    const handleToggleSelect = (testCaseId) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(testCaseId)) {
                newSet.delete(testCaseId);
            } else {
                newSet.add(testCaseId);
            }
            return newSet;
        });
    };

    // Select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTestCases.map(tc => tc.id)));
        }
        setSelectAll(!selectAll);
    };

    // Bulk approve
    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;

        try {
            const promises = Array.from(selectedIds).map(id =>
                testCasesAPI.update(id, { status: 'APPROVED' })
            );
            await Promise.all(promises);

            // Update local state
            setTestCases(prev =>
                prev.map(tc => selectedIds.has(tc.id) ? { ...tc, status: 'APPROVED' } : tc)
            );
            setSelectedIds(new Set());
            setSelectAll(false);
        } catch (err) {
            console.error('Failed to bulk approve:', err);
            alert('Failed to approve selected test cases');
        }
    };

    // Bulk reject
    const handleBulkReject = async () => {
        if (selectedIds.size === 0) return;

        const reason = prompt('Enter rejection reason for selected test cases:');
        if (!reason) return;

        try {
            const promises = Array.from(selectedIds).map(id =>
                testCasesAPI.update(id, { status: 'REJECTED', rejection_reason: reason })
            );
            await Promise.all(promises);

            // Update local state
            setTestCases(prev =>
                prev.map(tc =>
                    selectedIds.has(tc.id)
                        ? { ...tc, status: 'REJECTED', rejection_reason: reason }
                        : tc
                )
            );
            setSelectedIds(new Set());
            setSelectAll(false);
        } catch (err) {
            console.error('Failed to bulk reject:', err);
            alert('Failed to reject selected test cases');
        }
    };

    // Execute test cases
    const handleExecute = async () => {
        if (selectedIds.size === 0) {
            alert('Please select at least one test case to execute');
            return;
        }

        setExecuting(true);

        setExecuting(true);

        try {
            const selectedIdsArray = Array.from(selectedIds);
            const response = await testRunsAPI.execute(id, selectedIdsArray);
            const runData = response.data;

            // Backend returns: { run_id, status, summary, results: [...] }
            const results = runData.results.map(r => {
                // Find original test case info for display if needed
                const tc = testCases.find(t => t.id === r.test_case_id) || {};

                return {
                    id: r.test_case_id,
                    title: tc.title || 'Unknown Test Case',
                    endpoint: tc.endpoint_name || 'Unknown Endpoint',
                    expected_status: tc.expected_status,
                    actual_status: r.status_code,
                    passed: r.passed,
                    duration_ms: r.duration_ms || 0, // Backend doesn't return duration in summary yet, need to fetch
                    response_body: {} // Backend summary doesn't include full body, minimal view for now
                };
            });

            setExecutionResults({
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length,
                duration_ms: 0, // Mock for now or sum if available
                results: results
            });

            setExecuting(false);
            setShowResults(true);

        } catch (err) {
            console.error('Execution failed:', err);
            alert('Failed to execute test run');
            setExecuting(false);
        }
        setShowResults(true);
    };

    const handleCloseResults = () => {
        setShowResults(false);
        setSelectedIds(new Set());
        setSelectAll(false);
    };

    // Handle manual test creation
    const handleManualTestCreated = (newTest) => {
        setTestCases(prev => [...prev, newTest]);
    };

    // Handle AI test generation
    const handleAiTestsGenerated = (newTests) => {
        setTestCases(prev => [...prev, ...newTests]);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                    {workspace?.name || 'Loading...'}
                </Link>
                <Typography color="text.primary">Test Case Review</Typography>
            </Breadcrumbs>

            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Test Case Review
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Review and approve test cases before execution
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        color="success"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleRunAllTests}
                        disabled={testCases.length === 0}
                    >
                        Run All Tests ({testCases.length})
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setManualDrawerOpen(true)}
                    >
                        Add Test Case
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SmartToyIcon />}
                        onClick={() => setAiDrawerOpen(true)}
                    >
                        AI Assistant
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Filters and Bulk Actions */}
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                            <MenuItem value="ALL">All Statuses</MenuItem>
                            <MenuItem value="DRAFT">Pending Review</MenuItem>
                            <MenuItem value="APPROVED">Approved</MenuItem>
                            <MenuItem value="REJECTED">Rejected</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Category Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Category</InputLabel>
                        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label="Category">
                            <MenuItem value="ALL">All Categories</MenuItem>
                            <MenuItem value="FUNCTIONAL">Functional</MenuItem>
                            <MenuItem value="VALIDATION">Validation</MenuItem>
                            <MenuItem value="SECURITY">Security</MenuItem>
                            <MenuItem value="UX_ERROR">UX/Error</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Select All */}
                    <FormControlLabel
                        control={<Checkbox checked={selectAll} onChange={handleSelectAll} />}
                        label="Select All"
                    />

                    <Box flex={1} />

                    {/* Bulk Actions */}
                    {selectedIds.size > 0 && (
                        <>
                            <Chip label={`${selectedIds.size} selected`} color="primary" />
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={handleBulkReject}
                                size="small"
                            >
                                Bulk Reject
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleBulkApprove}
                                size="small"
                            >
                                Bulk Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={executing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                                onClick={handleExecute}
                                disabled={executing}
                                size="small"
                            >
                                {executing ? 'Executing...' : 'Execute Selected'}
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>

            {/* Test Cases Grouped by Endpoint */}
            {Object.keys(groupedTestCases).length === 0 ? (
                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="body1" color="text.secondary">
                        No test cases found matching the selected filters
                    </Typography>
                </Paper>
            ) : (
                Object.entries(groupedTestCases).map(([endpointId, group]) => (
                    <Accordion key={endpointId} defaultExpanded sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="h6">{group.endpoint}</Typography>
                                <Chip label={`${group.testCases.length} test cases`} size="small" />
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                {group.testCases.map(testCase => (
                                    <Box key={testCase.id} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                        <Checkbox
                                            checked={selectedIds.has(testCase.id)}
                                            onChange={() => handleToggleSelect(testCase.id)}
                                            disabled={testCase.status !== 'DRAFT'}
                                            sx={{ mt: 2 }}
                                        />
                                        <Box flex={1}>
                                            <TestCaseReviewCard
                                                testCase={testCase}
                                                onApprove={handleApprove}
                                                onReject={handleReject}
                                                onEdit={handleEdit}
                                                readOnly={testCase.status !== 'DRAFT'}
                                            />
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                ))
            )}

            {/* Execution Results Dialog */}
            <Dialog
                open={showResults}
                onClose={handleCloseResults}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6">Test Execution Results</Typography>
                        <Chip
                            label={`${executionResults?.passed || 0} Passed`}
                            color="success"
                            size="small"
                        />
                        <Chip
                            label={`${executionResults?.failed || 0} Failed`}
                            color="error"
                            size="small"
                        />
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {executionResults && (
                        <>
                            {/* Summary */}
                            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={4}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Total Tests</Typography>
                                        <Typography variant="h5">{executionResults.total}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
                                        <Typography variant="h5" color="success.main">
                                            {Math.round((executionResults.passed / executionResults.total) * 100)}%
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Total Duration</Typography>
                                        <Typography variant="h5">{executionResults.duration_ms}ms</Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Results Table */}
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Test Case</TableCell>
                                            <TableCell>Endpoint</TableCell>
                                            <TableCell align="center">Expected</TableCell>
                                            <TableCell align="center">Actual</TableCell>
                                            <TableCell align="right">Duration</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {executionResults.results.map((result) => (
                                            <TableRow
                                                key={result.id}
                                                sx={{
                                                    bgcolor: result.passed ? 'success.50' : 'error.50',
                                                    '&:hover': { bgcolor: result.passed ? 'success.100' : 'error.100' }
                                                }}
                                            >
                                                <TableCell>
                                                    {result.passed ? (
                                                        <CheckCircleOutlineIcon color="success" />
                                                    ) : (
                                                        <ErrorOutlineIcon color="error" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {result.title}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {result.endpoint}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={result.expected_status}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={result.actual_status}
                                                        size="small"
                                                        color={result.passed ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="caption">
                                                        {result.duration_ms}ms
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseResults}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            // Export results as JSON
                            const dataStr = JSON.stringify(executionResults, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `test-results-${new Date().toISOString()}.json`;
                            link.click();
                        }}
                    >
                        Export Results
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Manual Test Creator Drawer */}
            <ManualTestCreatorDrawer
                open={manualDrawerOpen}
                onClose={() => setManualDrawerOpen(false)}
                onTestCreated={handleManualTestCreated}
                endpoints={[
                    { id: 'ep-001', name: 'POST /api/users' },
                    { id: 'ep-002', name: 'GET /api/users/:id' },
                    { id: 'ep-003', name: 'PUT /api/users/:id' },
                ]}
            />

            {/* AI Test Generator Drawer */}
            <AiTestGeneratorDrawer
                open={aiDrawerOpen}
                onClose={() => setAiDrawerOpen(false)}
                onTestsGenerated={handleAiTestsGenerated}
                endpoints={[
                    { id: 'ep-001', name: 'POST /api/users' },
                    { id: 'ep-002', name: 'GET /api/users/:id' },
                    { id: 'ep-003', name: 'PUT /api/users/:id' },
                ]}
                existingTests={testCases}
                projectId={id}
            />

            {/* Bulk Execution Progress Dialog */}
            <BulkExecutionProgressDialog
                open={bulkProgressDialogOpen}
                onClose={() => {
                    setBulkProgressDialogOpen(false);
                    setBulkRunId(null);
                }}
                runId={bulkRunId}
                projectId={id}
            />
        </Container>
    );
};

export default TestCaseReviewPage;
