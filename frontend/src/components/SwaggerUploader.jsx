import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Divider,
    InputAdornment,
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Link as LinkIcon,
} from '@mui/icons-material';

/**
 * SwaggerUploader Component
 * 
 * Allows users to upload Swagger/OpenAPI specs via file or URL
 * Matches the design mockup provided by the user
 * 
 * Props:
 * - onSwaggerSubmit: (data: { type: 'file'|'url', content }) => void
 * - isLoading: boolean
 * - error: string | null
 * - workspaceId: string
 */
const SwaggerUploader = ({
    onSwaggerSubmit,
    isLoading = false,
    error = null,
    workspaceId
}) => {
    const [swaggerUrl, setSwaggerUrl] = useState('');

    const [uploadedFile, setUploadedFile] = useState(null);

    // Dropzone configuration
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'application/json': ['.json'],
            'text/yaml': ['.yaml', '.yml'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setUploadedFile(acceptedFiles[0]);
                setSwaggerUrl(''); // Clear URL if file is uploaded
            }
        },
    });

    const handleUrlFetch = () => {
        if (!swaggerUrl.trim()) {
            return;
        }
        // If separate handling is preferred or if onSwaggerSubmit is a generic handler:
        // Here we can either call the API directly or pass metadata to the parent.
        // Based on the new design, we should differentiate file upload vs crawler.

        onSwaggerSubmit({
            type: 'url',
            content: swaggerUrl,
        });
    };

    const handleFileUpload = () => {
        if (!uploadedFile) {
            return;
        }
        onSwaggerSubmit({
            type: 'file',
            content: uploadedFile,
        });
    };

    const handleSubmit = () => {
        if (uploadedFile) {
            handleFileUpload();
        } else if (swaggerUrl.trim()) {
            handleUrlFetch();
        }
    };

    return (
        <Card elevation={2} sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Swagger/OpenAPI Specification
                </Typography>

                <Stack spacing={3} mt={2}>
                    {/* File Upload Section */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Upload Specification File
                        </Typography>
                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                borderRadius: 2,
                                p: 4,
                                textAlign: 'center',
                                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <input {...getInputProps()} />
                            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="body1" gutterBottom>
                                {uploadedFile
                                    ? `Selected: ${uploadedFile.name}`
                                    : 'Drop Swagger file here or click to browse'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Supported: JSON, YAML (Max 10MB)
                            </Typography>
                        </Box>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="body2" sx={{ px: 2, color: 'text.secondary' }}>
                            OR
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                    </Box>

                    {/* URL Input Section */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Swagger URL
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                fullWidth
                                placeholder="https://api.example.com/swagger.json"
                                value={swaggerUrl}
                                onChange={(e) => {
                                    setSwaggerUrl(e.target.value);
                                    setUploadedFile(null); // Clear file if URL is entered
                                }}
                                disabled={isLoading || !!uploadedFile}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                variant="outlined"
                                onClick={handleUrlFetch}
                                disabled={!swaggerUrl.trim() || isLoading || !!uploadedFile}
                                sx={{ minWidth: 100 }}
                            >
                                Fetch
                            </Button>
                        </Stack>
                    </Box>

                    {/* Error Display */}
                    {error && (
                        <Alert severity="error" onClose={() => { }}>
                            {error}
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={(!uploadedFile && !swaggerUrl.trim()) || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                        fullWidth
                    >
                        {isLoading ? 'Processing...' : 'Import & Generate Endpoints'}
                    </Button>

                    {/* Helper Text */}
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                        The system will parse the Swagger specification and automatically
                        generate endpoints and test cases.
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default SwaggerUploader;
