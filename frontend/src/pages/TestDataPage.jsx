import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Breadcrumbs, Link, Button } from '@mui/material';
import TestDataManager from '../components/TestDataManager';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const TestDataPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <Container maxWidth={false} sx={{ mt: 2, mb: 4, px: 4 }}>
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
                    onClick={() => navigate(`/projects/${id}`)} // Assuming this goes to project details/CollectionsExplorer
                    sx={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                    Project
                </Link>
                <Typography color="text.primary">Test Data</Typography>
            </Breadcrumbs>

            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Test Data Management
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Upload CSV or JSON files to drive your data-driven tests.
                    </Typography>
                </Box>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                >
                    Back
                </Button>
            </Box>

            <TestDataManager projectId={id} />
        </Container>
    );
};

export default TestDataPage;
