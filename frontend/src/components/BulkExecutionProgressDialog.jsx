import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    LinearProgress,
    Box,
    Typography,
    Grid,
    Chip,
    IconButton,
} from '@mui/material';
import {
    CheckCircle as PassIcon,
    Cancel as FailIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

const BulkExecutionProgressDialog = ({ open, onClose, runId, projectId }) => {
    const [progress, setProgress] = useState({
        run_id: null,
        status: 'PENDING',
        total_tests: 0,
        completed: 0,
        passed: 0,
        failed: 0,
        progress_percentage: 0,
        elapsed_seconds: 0,
        current_test: null,
    });
    const [isComplete, setIsComplete] = useState(false);
    const [errorCount, setErrorCount] = useState(0);

    useEffect(() => {
        if (!runId || !open) return;

        let errors = 0;

        // Poll for progress every 2 seconds
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:8001/api/bulk-runs/${runId}/progress`);
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                const data = await response.json();

                setProgress(data);
                errors = 0; // Reset on success

                if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                    setIsComplete(true);
                    clearInterval(intervalId);
                }
            } catch (error) {
                errors++;
                console.error(`Error fetching progress (attempt ${errors}):`, error);
                if (errors >= 5) {
                    console.error('Too many errors, stopping progress polling');
                    setProgress(prev => ({ ...prev, status: 'FAILED' }));
                    setIsComplete(true);
                    clearInterval(intervalId);
                }
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [runId, open]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog
            open={open}
            onClose={isComplete ? onClose : undefined}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={!isComplete}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        {isComplete ? 'Execution Complete' : 'Running Tests...'}
                    </Typography>
                    {isComplete && (
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    )}
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Progress Bar */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Progress: {progress.completed} / {progress.total_tests}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress.progress_percentage}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {progress.progress_percentage}%
                    </Typography>
                </Box>

                {/* Stats Grid */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="h4">{progress.total_tests}</Typography>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                            <Typography variant="h4">{progress.passed}</Typography>
                            <Typography variant="caption">Passed</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1, color: 'error.contrastText' }}>
                            <Typography variant="h4">{progress.failed}</Typography>
                            <Typography variant="caption">Failed</Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Status and Timer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Chip
                        label={progress.status}
                        color={progress.status === 'COMPLETED' ? 'success' : progress.status === 'FAILED' ? 'error' : 'primary'}
                        size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                        Elapsed: {formatTime(progress.elapsed_seconds)}
                    </Typography>
                </Box>

                {/* Current Test */}
                {progress.current_test && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Running:
                        </Typography>
                        <Typography variant="body2">{progress.current_test}</Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {isComplete && progress.failed === 0 && progress.passed > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ mr: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PassIcon fontSize="small" />
                        All tests passed!
                    </Typography>
                )}
                {isComplete && progress.failed > 0 && (
                    <Typography variant="body2" color="error" sx={{ mr: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FailIcon fontSize="small" />
                        {progress.passed > 0
                            ? `${progress.passed} passed, ${progress.failed} failed`
                            : `${progress.failed} test(s) failed`}
                    </Typography>
                )}
                {isComplete && progress.status === 'FAILED' && progress.failed === 0 && (
                    <Typography variant="body2" color="error" sx={{ mr: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FailIcon fontSize="small" />
                        Execution failed
                    </Typography>
                )}
                {isComplete && (
                    <>
                        <Button
                            onClick={() => {
                                if (projectId) {
                                    window.location.href = `/projects/${projectId}/reports`;
                                }
                                onClose();
                            }}
                            variant="outlined"
                            color="primary"
                        >
                            View Results
                        </Button>
                        <Button onClick={onClose} variant="contained">
                            Close
                        </Button>
                    </>
                )}
                {!isComplete && (
                    <Button onClick={onClose} variant="outlined" disabled>
                        Running...
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default BulkExecutionProgressDialog;
