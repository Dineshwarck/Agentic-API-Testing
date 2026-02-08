import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Breadcrumbs,
    Link,
    CircularProgress,
    Alert,
    Paper,
    Button,
} from '@mui/material';
import { Refresh as RefreshIcon, CheckBox, PlayArrow, Badge } from '@mui/icons-material';
import CollectionTree from '../components/CollectionTree';
import EndpointRequestPanel from '../components/EndpointRequestPanel';
import { projectsAPI, agentAPI, endpointsAPI } from '../api/endpoints';
import { createMockCollections } from '../utils/mockCollections';
import axios from 'axios';

/**
 * CollectionsExplorerPage Component
 * 
 * Postman-like interface for exploring and testing endpoints
 * Features split layout: collection tree sidebar + endpoint request panel
 * 
 * Route: /workspaces/:id/collections
 */
import EnvironmentSelector from '../components/EnvironmentSelector';
import { substituteVariables } from '../utils/variableSubstitution';

/**
 * CollectionsExplorerPage Component
 * 
 * Postman-like interface for exploring and testing endpoints
 * Features split layout: collection tree sidebar + endpoint request panel
 * 
 * Route: /workspaces/:id/collections
 */
const CollectionsExplorerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [endpoints, setEndpoints] = useState([]);
    const [collections, setCollections] = useState([]);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requestInProgress, setRequestInProgress] = useState(false);

    // Environment State
    const [activeEnvironment, setActiveEnvironment] = useState(null);

    // Multi-Select State for Bulk Test Generation
    const [selectMode, setSelectMode] = useState(false);
    const [selectedEndpoints, setSelectedEndpoints] = useState([]);
    const [generatingTests, setGeneratingTests] = useState(false);
    const [generationResult, setGenerationResult] = useState(null);

    // Fetch workspace and endpoints
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch workspace details
                const workspaceResponse = await projectsAPI.get(id);
                setWorkspace(workspaceResponse.data);

                // Fetch endpoints
                const endpointsResponse = await projectsAPI.listEndpoints(id);
                const fetchedEndpoints = endpointsResponse.data;
                setEndpoints(fetchedEndpoints);

                // Create mock collections from endpoints
                const mockCollections = createMockCollections(fetchedEndpoints);
                setCollections(mockCollections);

                // Auto-select first endpoint if available
                if (fetchedEndpoints.length > 0) {
                    setSelectedEndpoint(fetchedEndpoints[0]);
                }
            } catch (err) {
                setError('Failed to load workspace data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Handle endpoint selection
    const handleEndpointSelect = (endpoint) => {
        setSelectedEndpoint(endpoint);
        setResponse(null); // Clear previous response
    };

    // Handle endpoint update (e.g., saving auth config)
    const handleUpdateEndpoint = async (id, data) => {
        try {
            const updatedEndpointResponse = await endpointsAPI.update(id, data);
            const updatedEndpoint = updatedEndpointResponse.data;

            // Update endpoints list
            const updatedEndpoints = endpoints.map(ep =>
                ep.id === id ? updatedEndpoint : ep
            );
            setEndpoints(updatedEndpoints);

            // Re-generate collections
            const updatedCollections = createMockCollections(updatedEndpoints);
            setCollections(updatedCollections);

            // Update selected endpoint if it's the one being updated
            if (selectedEndpoint && selectedEndpoint.id === id) {
                setSelectedEndpoint(updatedEndpoint);
            }
        } catch (err) {
            console.error('Failed to update endpoint:', err);
            setError('Failed to save endpoint configuration');
        }
    };

    // Handle request send
    const handleSendRequest = async (requestConfig) => {
        setRequestInProgress(true);
        setResponse(null);

        try {
            const startTime = Date.now();

            // Prepare Environment Variables (convert object to array if needed or just pass array)
            const envVars = activeEnvironment ? Object.entries(activeEnvironment.variables).map(([k, v]) => ({ key: k, value: v })) : [];

            // Build request configuration WITH Variable Substitution
            const config = {
                method: requestConfig.method,
                url: substituteVariables(requestConfig.url, envVars),
                headers: substituteVariables(requestConfig.headers, envVars),
                params: substituteVariables(requestConfig.params, envVars),
            };

            // Add body for non-GET requests
            if (requestConfig.body && requestConfig.method !== 'GET' && requestConfig.method !== 'HEAD') {
                config.data = substituteVariables(requestConfig.body, envVars);
            }

            // Execute request
            // Execute request via backend proxy
            const response = await agentAPI.executeRequest(config);

            // Backend returns: { status, status_text, headers, data, size, time }
            const result = response.data;

            // Set response data from backend structure
            setResponse({
                status: result.status,
                statusText: result.status_text,
                data: result.data,
                headers: result.headers,
                time: result.time,
                size: (result.size / 1024).toFixed(2), // Already in bytes, convert to KB
            });
            return; // Exit here as we handled it below differently in original code

            /* Original Axios Code - Removed
            const apiResponse = await axios(config);
            ...
            */

            // Legacy logic removed as backend handles metrics
            /*
            const endTime = Date.now();
            const duration = endTime - startTime;
            ...
            */

        } catch (err) {
            // Handle error response
            const status = err.response?.status || 0;
            const data = err.response?.data || { error: err.message };

            setResponse({
                status,
                statusText: err.response?.statusText || 'Error',
                data,
                headers: err.response?.headers || {},
                time: 0,
                size: 0,
            });
        } finally {
            setRequestInProgress(false);
        }
    };

    // Handle Select Mode Toggle
    const handleSelectModeToggle = () => {
        setSelectMode(!selectMode);
        setSelectedEndpoints([]); // Clear selection when toggling
    };

    // Handle Endpoint Selection (checkbox)
    const handleEndpointSelection = (endpointId) => {
        setSelectedEndpoints(prev => {
            if (prev.includes(endpointId)) {
                return prev.filter(id => id !== endpointId);
            } else {
                return [...prev, endpointId];
            }
        });
    };

    // Handle Select All
    const handleSelectAll = () => {
        if (selectedEndpoints.length === endpoints.length) {
            setSelectedEndpoints([]);
        } else {
            setSelectedEndpoints(endpoints.map(ep => ep.id));
        }
    };

    // Handle Generate Test Cases for selected endpoints
    const handleGenerateTestCases = async () => {
        if (selectedEndpoints.length === 0) return;

        setGeneratingTests(true);
        setGenerationResult(null);
        setError(null);

        try {
            const response = await agentAPI.generateSpecs(id, null, null, selectedEndpoints);
            setGenerationResult(response.data);

            // Navigate to review page after successful generation
            setTimeout(() => {
                navigate(`/projects/${id}/review`);
            }, 2000);
        } catch (err) {
            console.error('Test generation error:', err);
            setError(err.response?.data?.message || 'Failed to generate test cases');
        } finally {
            setGeneratingTests(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', p: 2 }}>
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Breadcrumbs>
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
                            <Typography color="text.primary">Collections</Typography>
                        </Breadcrumbs>
                        {/* Actions */}
                        <Box display="flex" gap={2} alignItems="center">
                            <EnvironmentSelector
                                projectId={id}
                                activeEnvironmentId={activeEnvironment?.id}
                                onEnvironmentChange={setActiveEnvironment}
                            />
                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={() => window.location.reload()}
                                size="small"
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Box>
                    <Typography variant="h5">
                        Collections Explorer
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {collections.length} collections · {endpoints.length} endpoints
                    </Typography>

                    {/* Multi-Select Toolbar */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant={selectMode ? "contained" : "outlined"}
                            size="small"
                            startIcon={<CheckBox />}
                            onClick={handleSelectModeToggle}
                        >
                            {selectMode ? 'Exit Select Mode' : 'Select Endpoints'}
                        </Button>

                        {selectMode && (
                            <>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleSelectAll}
                                >
                                    {selectedEndpoints.length === endpoints.length ? 'Deselect All' : 'Select All'}
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<PlayArrow />}
                                    onClick={handleGenerateTestCases}
                                    disabled={selectedEndpoints.length === 0 || generatingTests}
                                >
                                    {generatingTests ? 'Generating...' : 'Generate Test Cases'}
                                </Button>

                                {selectedEndpoints.length > 0 && (
                                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                        {selectedEndpoints.length} endpoint{selectedEndpoints.length !== 1 ? 's' : ''} selected
                                    </Typography>
                                )}

                                {generationResult && (
                                    <Alert severity="success" sx={{ flex: 1 }}>
                                        Generated {generationResult.test_count || 0} test cases! Redirecting to Test Plan...
                                    </Alert>
                                )}
                            </>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Main Content - Split Layout */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Sidebar - Collection Tree */}
                <Paper
                    elevation={0}
                    sx={{
                        width: 320,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {collections.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No endpoints available
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Import a Swagger specification to get started
                            </Typography>
                        </Box>
                    ) : (
                        <CollectionTree
                            collections={collections}
                            onEndpointSelect={handleEndpointSelect}
                            selectedEndpointId={selectedEndpoint?.id}
                            selectMode={selectMode}
                            selectedEndpoints={selectedEndpoints}
                            onEndpointSelection={handleEndpointSelection}
                        />
                    )}
                </Paper>

                {/* Right Panel - Endpoint Request/Response */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {requestInProgress && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                            }}
                        >
                            <Paper elevation={4} sx={{ p: 4, textAlign: 'center' }}>
                                <CircularProgress />
                                <Typography variant="body2" sx={{ mt: 2 }}>
                                    Sending request...
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    <EndpointRequestPanel
                        endpoint={selectedEndpoint}
                        onSendRequest={handleSendRequest}
                        onUpdateEndpoint={handleUpdateEndpoint}
                        response={response}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default CollectionsExplorerPage;
