import React, { useState, useEffect } from 'react';
import {
    Box, Button, Typography, Paper, Table, TableBody, TableCell,
    TableHead, TableRow, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, LinearProgress, Alert
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Visibility as PreviewIcon,
    InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { fileAPI } from '../api/endpoints';

const TestDataManager = ({ projectId }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, [projectId]);

    const fetchFiles = async () => {
        try {
            const data = await fileAPI.listTestData(projectId);
            setFiles(data);
        } catch (err) {
            console.error("Failed to fetch test data list:", err);
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            await fileAPI.uploadTestData(projectId, file);
            fetchFiles();
        } catch (err) {
            setError("Failed to upload file. Please try again.");
            console.error(err);
        } finally {
            setUploading(false);
            event.target.value = null; // Reset input
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this file?")) return;
        try {
            await fileAPI.deleteTestData(id);
            fetchFiles();
        } catch (err) {
            setError("Failed to delete file.");
        }
    };

    const handlePreview = async (id) => {
        try {
            const data = await fileAPI.previewTestData(id);
            setPreviewData(data);
            setPreviewOpen(true);
        } catch (err) {
            setError("Failed to load preview.");
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Test Data Files (CSV/JSON)</Typography>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<UploadIcon />}
                >
                    Upload New File
                    <input
                        type="file"
                        hidden
                        accept=".csv,.json"
                        onChange={handleUpload}
                    />
                </Button>
            </Box>

            {uploading && <LinearProgress sx={{ mb: 2 }} />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Rows</TableCell>
                            <TableCell>Uploaded</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {files.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                                        No test data files uploaded yet. Upload a CSV to get started.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            files.map((file) => (
                                <TableRow key={file.id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FileIcon color="action" />
                                            {file.name}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{file.file_type.toUpperCase()}</TableCell>
                                    <TableCell>{file.row_count}</TableCell>
                                    <TableCell>{new Date(file.uploaded_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handlePreview(file.id)} title="Preview">
                                            <PreviewIcon />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(file.id)} title="Delete">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Paper>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Data Preview (First 5 Rows)</DialogTitle>
                <DialogContent>
                    {previewData && (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {previewData.headers.map((h, i) => (
                                        <TableCell key={i} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {previewData.rows.map((row, i) => (
                                    <TableRow key={i}>
                                        {previewData.headers.map((h, j) => (
                                            <TableCell key={j}>{String(row[h] || '')}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TestDataManager;
