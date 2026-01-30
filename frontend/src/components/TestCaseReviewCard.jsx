import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Chip,
    Button,
    Box,
    Stack,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Collapse,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    ExpandMore as ExpandMoreIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Functions as FunctionsIcon,
    Rule as RuleIcon,
    Security as SecurityIcon,
    EmojiEmotions as EmojiEmotionsIcon,
} from '@mui/icons-material';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('json', json);

/**
 * TestCaseReviewCard Component
 * 
 * Review interface for individual test cases
 * 
 * Props:
 * - testCase: Test case object
 * - onApprove: (id) => void
 * - onReject: (id, reason) => void
 * - readOnly: boolean - If true, hide approve/reject buttons
 */
const TestCaseReviewCard = ({ testCase, onApprove, onReject, onEdit, readOnly = false }) => {
    const [expanded, setExpanded] = useState(false);
    const [assertionsExpanded, setAssertionsExpanded] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editedPayload, setEditedPayload] = useState(JSON.stringify(testCase.payload || {}, null, 2));
    const [editedExpectedStatus, setEditedExpectedStatus] = useState(testCase.expected_status || 200);

    const handleApprove = () => {
        onApprove && onApprove(testCase.id);
    };

    const handleRejectClick = () => {
        setRejectDialogOpen(true);
    };

    const handleRejectConfirm = () => {
        onReject && onReject(testCase.id, rejectionReason);
        setRejectDialogOpen(false);
        setRejectionReason('');
    };

    const handleRejectCancel = () => {
        setRejectDialogOpen(false);
        setRejectionReason('');
    };

    const handleEditClick = () => {
        setEditedPayload(JSON.stringify(testCase.payload || {}, null, 2));
        setEditedExpectedStatus(testCase.expected_status || 200);
        setEditDialogOpen(true);
    };

    const handleEditSave = () => {
        try {
            const parsedPayload = JSON.parse(editedPayload);
            onEdit && onEdit(testCase.id, {
                payload: parsedPayload,
                expected_status: editedExpectedStatus
            });
            setEditDialogOpen(false);
        } catch (err) {
            alert('Invalid JSON in payload');
        }
    };

    const handleEditCancel = () => {
        setEditDialogOpen(false);
    };

    // Category configuration
    const getCategoryConfig = (category) => {
        const configs = {
            FUNCTIONAL: {
                color: 'primary',
                icon: <FunctionsIcon fontSize="small" />,
                label: 'Functional',
            },
            VALIDATION: {
                color: 'warning',
                icon: <RuleIcon fontSize="small" />,
                label: 'Validation',
            },
            SECURITY: {
                color: 'error',
                icon: <SecurityIcon fontSize="small" />,
                label: 'Security',
            },
            UX_ERROR: {
                color: 'info',
                icon: <EmojiEmotionsIcon fontSize="small" />,
                label: 'UX/Error',
            },
        };
        return configs[category] || configs.FUNCTIONAL;
    };

    // Status configuration
    const getStatusConfig = (status) => {
        const configs = {
            DRAFT: { color: 'default', label: 'Draft' },
            APPROVED: { color: 'success', label: 'Approved' },
            REJECTED: { color: 'error', label: 'Rejected' },
        };
        return configs[status] || configs.DRAFT;
    };

    const categoryConfig = getCategoryConfig(testCase.category);
    const statusConfig = getStatusConfig(testCase.status);

    return (
        <>
            <Card
                elevation={1}
                sx={{
                    mb: 2,
                    border: testCase.status === 'APPROVED' ? '2px solid' : 'none',
                    borderColor: 'success.light',
                    transition: 'all 0.2s',
                    '&:hover': {
                        boxShadow: 3,
                    },
                }}
            >
                <CardContent>
                    {/* Header */}
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                        <Chip
                            icon={categoryConfig.icon}
                            label={categoryConfig.label}
                            color={categoryConfig.color}
                            size="small"
                        />
                        <Chip
                            label={statusConfig.label}
                            color={statusConfig.color}
                            size="small"
                        />
                        {testCase.is_generated && (
                            <Chip label="Auto-generated" size="small" variant="outlined" />
                        )}
                    </Stack>

                    {/* Title and Description */}
                    <Typography variant="h6" gutterBottom>
                        {testCase.title}
                    </Typography>
                    {testCase.description && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {testCase.description}
                        </Typography>
                    )}

                    {/* Expected Status */}
                    <Box mb={1}>
                        <Typography variant="caption" color="text.secondary">
                            Expected Status Code:
                        </Typography>
                        <Typography variant="body2">
                            {testCase.expected_status || 200}
                        </Typography>
                    </Box>

                    {/* Expand/Collapse Details */}
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            endIcon={
                                <ExpandMoreIcon
                                    sx={{
                                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: '0.3s',
                                    }}
                                />
                            }
                        >
                            {expanded ? 'Hide' : 'Show'} Request Payload
                        </Button>
                        <Button
                            size="small"
                            onClick={() => setAssertionsExpanded(!assertionsExpanded)}
                            endIcon={
                                <ExpandMoreIcon
                                    sx={{
                                        transform: assertionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: '0.3s',
                                    }}
                                />
                            }
                        >
                            {assertionsExpanded ? 'Hide' : 'Show'} Assertions
                        </Button>
                    </Stack>

                    {/* Expanded Details */}
                    <Collapse in={expanded} timeout="auto">
                        <Box mt={2}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                                Request Payload:
                            </Typography>
                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    mt: 1,
                                }}
                            >
                                <SyntaxHighlighter
                                    language="json"
                                    style={github}
                                    customStyle={{ margin: 0, fontSize: 12 }}
                                >
                                    {JSON.stringify(testCase.payload || {}, null, 2)}
                                </SyntaxHighlighter>
                            </Box>
                        </Box>
                    </Collapse>

                    {/* Assertions */}
                    <Collapse in={assertionsExpanded} timeout="auto">
                        <Box mt={2}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                                Assertions (Validation Rules):
                            </Typography>
                            {testCase.assertions && testCase.assertions.length > 0 ? (
                                <Box
                                    sx={{
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        mt: 1,
                                    }}
                                >
                                    <SyntaxHighlighter
                                        language="json"
                                        style={github}
                                        customStyle={{ margin: 0, fontSize: 12 }}
                                    >
                                        {JSON.stringify(testCase.assertions, null, 2)}
                                    </SyntaxHighlighter>
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                    No assertions defined (only checking status code)
                                </Typography>
                            )}
                        </Box>
                    </Collapse>

                    {/* Reviewer Info (if reviewed) */}
                    {(testCase.reviewed_by || testCase.reviewed_at) && (
                        <Box mt={2} p={1} bgcolor="action.hover" borderRadius={1}>
                            <Typography variant="caption" display="block" color="text.secondary">
                                Reviewed by: {testCase.reviewed_by || 'Unknown'}
                            </Typography>
                            {testCase.reviewed_at && (
                                <Typography variant="caption" color="text.secondary">
                                    On: {new Date(testCase.reviewed_at).toLocaleString()}
                                </Typography>
                            )}
                            {testCase.rejection_reason && (
                                <Typography variant="body2" color="error.main" mt={1}>
                                    Reason: {testCase.rejection_reason}
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>

                {/* Actions */}
                {!readOnly && testCase.status === 'DRAFT' && (
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={handleEditClick}
                        >
                            Edit Test Case
                        </Button>
                        <Box>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={handleRejectClick}
                                sx={{ mr: 1 }}
                            >
                                Reject
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleApprove}
                            >
                                Approve
                            </Button>
                        </Box>
                    </CardActions>
                )}
            </Card>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={handleRejectCancel} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Test Case</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Please provide a reason for rejecting this test case:
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRejectCancel}>Cancel</Button>
                    <Button
                        onClick={handleRejectConfirm}
                        variant="contained"
                        color="error"
                        disabled={!rejectionReason.trim()}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Test Case Dialog */}
            <Dialog open={editDialogOpen} onClose={handleEditCancel} maxWidth="md" fullWidth>
                <DialogTitle>Edit Test Case</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Modify the test case payload or expected status code:
                    </Typography>

                    {/* Expected Status */}
                    <TextField
                        fullWidth
                        label="Expected Status Code"
                        type="number"
                        value={editedExpectedStatus}
                        onChange={(e) => setEditedExpectedStatus(parseInt(e.target.value))}
                        sx={{ mt: 2, mb: 2 }}
                        helperText="HTTP status code (e.g., 200, 201, 400, 404)"
                    />

                    {/* Payload Editor */}
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Request Payload (JSON):
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={15}
                        value={editedPayload}
                        onChange={(e) => setEditedPayload(e.target.value)}
                        sx={{ mt: 1, fontFamily: 'monospace', fontSize: 12 }}
                        placeholder="Enter JSON payload..."
                    />

                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                        ⚠️ Make sure the JSON is valid before saving
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditCancel}>Cancel</Button>
                    <Button
                        onClick={handleEditSave}
                        variant="contained"
                        color="primary"
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TestCaseReviewCard;
