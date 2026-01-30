import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Paper,
    Button,
    Alert,
    CircularProgress,
    Breadcrumbs,
    Link,
    Divider,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Folder as FolderIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import SwaggerUploader from '../components/SwaggerUploader';
import { projectsAPI, agentAPI } from '../api/endpoints';

/**
 * WorkspaceConfigPage Component
 * 
 * Configuration page for a workspace with Swagger upload functionality
 * Route: /workspaces/:id/config
 */
const WorkspaceConfigPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [importResult, setImportResult] = useState(null);

    // Fetch workspace details
    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                setLoading(true);
                const response = await projectsAPI.get(id);
                setWorkspace(response.data);
            } catch (err) {
                setError('Failed to load workspace details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspace();
    }, [id]);

    // Handle Swagger submission
    const handleSwaggerSubmit = async (data) => {
        setUploading(true);
        setError(null);
        setSuccessMessage(null);
        setImportResult(null);

        try {
            if (data.type === 'url') {
                // Call Agentic Crawler

                const response = await agentAPI.generateFromSwagger(id, data.content);

                // Assuming backend returns stats
                const result = response.data;

                setImportResult({
                    collections_created: result.collections_created || 0,
                    endpoints_created: result.endpoints_created || 0,
                    test_cases_generated: result.count || 0,
                    errors: result.errors || [],
                });

                setSuccessMessage('Swagger URL successfully crawled and tests generated!');
            } else {
                // Handle File Upload (Existing logic or TODO)
                console.log('File upload not yet fully implemented in backend integration');
                // Simulate for file for now
                await new Promise(resolve => setTimeout(resolve, 1000));
                setImportResult({
                    collections_created: 1,
                    endpoints_created: 5,
                    test_cases_generated: 10,
                    errors: [],
                });
                setSuccessMessage('Swagger file processed (Simulation)');
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to import Swagger specification');
            console.error('Swagger import error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleViewCollections = () => {
        navigate(`/projects/${id}/collections`);
    };

    const handleBackToWorkspaces = () => {
        navigate('/projects');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!workspace) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">Workspace not found</Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBackToWorkspaces} sx={{ mt: 2 }}>
                    Back to Workspaces
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ mt: 2, mb: 2, px: 4 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link
                    component="button"
                    variant="body1"
                    onClick={handleBackToWorkspaces}
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
                <Typography color="text.primary">Configuration</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Workspace Configuration
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Import API specifications to automatically generate endpoints and test cases
                </Typography>
            </Box>

            {/* Success Message */}
            {successMessage && (
                <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" size="small" onClick={handleViewCollections}>
                            View Collections
                        </Button>
                    }
                >
                    {successMessage}
                </Alert>
            )}

            {/* Import Results */}
            {importResult && (
                <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'success.50' }}>
                    <Typography variant="h6" gutterBottom color="success.main">
                        Import Summary
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary.main">
                                {importResult.collections_created}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Collections Created
                            </Typography>
                        </Box>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary.main">
                                {importResult.endpoints_created}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Endpoints Generated
                            </Typography>
                        </Box>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary.main">
                                {importResult.test_cases_generated}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Test Cases Created
                            </Typography>
                        </Box>
                    </Box>

                    {importResult.errors && importResult.errors.length > 0 && (
                        <Box mt={2}>
                            <Alert severity="warning">
                                <Typography variant="subtitle2" gutterBottom>
                                    Warnings:
                                </Typography>
                                <ul>
                                    {importResult.errors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </Alert>
                        </Box>
                    )}

                    <Box mt={3} display="flex" justifyContent="center">
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<FolderIcon />}
                            onClick={handleViewCollections}
                        >
                            Explore Collections & Endpoints
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Swagger Uploader */}
            <SwaggerUploader
                workspaceId={id}
                onSwaggerSubmit={handleSwaggerSubmit}
                isLoading={uploading}
                error={error}
            />

            {/* Info Box */}
            <Paper elevation={0} sx={{ p: 3, mt: 3, bgcolor: 'info.50', border: 1, borderColor: 'info.200' }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                    💡 How it works
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    1. Upload your Swagger/OpenAPI specification (JSON or YAML format) or provide a URL
                    <br />
                    2. The system will automatically parse the specification and extract all endpoints
                    <br />
                    3. Collections will be created based on API tags and endpoint groupings
                    <br />
                    4. Comprehensive test cases will be generated for each endpoint
                    <br />
                    5. Review and approve test cases before execution
                </Typography>
            </Paper>

            {/* Action Buttons */}
            <Box mt={4} display="flex" gap={2}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToWorkspaces}
                >
                    Back to Workspaces
                </Button>

                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate(`/projects/${id}/test-data`)}
                >
                    Manage Test Data
                </Button>

                {importResult && (
                    <Button
                        variant="contained"
                        startIcon={<FolderIcon />}
                        onClick={handleViewCollections}
                    >
                        View Collections
                    </Button>
                )}
            </Box>
        </Container>
    );
};

export default WorkspaceConfigPage;
