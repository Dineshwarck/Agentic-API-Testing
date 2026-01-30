import { useState } from 'react'
import {
    Box,
    Typography,
    Paper,
    Chip,
    IconButton,
    Collapse,
    TextField,
    Button,
    Stack,
    Divider,
    Checkbox,
    Tooltip
} from '@mui/material'
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Edit as EditIcon,
    Send as SendIcon,
    Delete as DeleteIcon,
    DeleteSweep as DeleteSweepIcon,
    PlayArrow as PlayArrowIcon
} from '@mui/icons-material'
import { testCasesAPI } from '../api/endpoints'

function TestCaseItem({ testCase, onUpdate, onDelete, selected, onSelect, onRun }) {
    const [expanded, setExpanded] = useState(false)
    const [comment, setComment] = useState('')
    const [payload, setPayload] = useState(JSON.stringify(testCase.payload, null, 2))
    const [isEditing, setIsEditing] = useState(false)

    const handleToggleApprove = async (e) => {
        e.stopPropagation()
        const newStatus = testCase.status === 'APPROVED' ? 'DRAFT' : 'APPROVED'
        try {
            await testCasesAPI.update(testCase.id, { status: newStatus })
            onUpdate(testCase.id, { status: newStatus })
        } catch (error) {
            console.error("Failed to update status", error)
        }
    }

    const handleDelete = async (e) => {
        e.stopPropagation()
        if (!window.confirm("Delete this test case?")) return
        try {
            await testCasesAPI.delete(testCase.id)
            onDelete(testCase.id)
        } catch (error) {
            console.error("Failed to delete", error)
        }
    }

    const handleRefine = async () => {
        if (!comment.trim()) return
        try {
            const response = await testCasesAPI.refine(testCase.id, comment)
            onUpdate(testCase.id, response.data)
            setComment('')
        } catch (error) {
            console.error("Failed to refine", error)
        }
    }

    const handleSavePayload = async () => {
        try {
            const parsed = JSON.parse(payload)
            await testCasesAPI.update(testCase.id, { payload: parsed })
            onUpdate(testCase.id, { payload: parsed })
            setIsEditing(false)
        } catch (error) {
            alert("Invalid JSON")
        }
    }

    return (
        <Paper sx={{ mb: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    bgcolor: testCase.status === 'APPROVED' ? 'action.selected' : 'background.paper'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                {/* Selection Checkbox */}
                <Checkbox
                    checked={selected}
                    onClick={(e) => { e.stopPropagation(); onSelect(testCase.id) }}
                    sx={{ mr: 1 }}
                />

                <Tooltip title={testCase.status === 'APPROVED' ? "Approved (will run)" : "Draft (skipped)"}>
                    <IconButton onClick={handleToggleApprove} color={testCase.status === 'APPROVED' ? 'success' : 'default'} sx={{ mr: 1 }}>
                        {testCase.status === 'APPROVED' ? <CheckCircleIcon /> : <UncheckedIcon />}
                    </IconButton>
                </Tooltip>

                <Box sx={{ ml: 1, flexGrow: 1 }}>
                    <Typography variant="subtitle1" component="div">
                        {testCase.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Expected: {testCase.expected_status} | {testCase.description?.substring(0, 60)}...
                    </Typography>
                </Box>

                <Chip label={testCase.status} size="small" color={testCase.status === 'APPROVED' ? 'success' : 'default'} sx={{ mr: 1 }} />

                <IconButton onClick={handleDelete} color="error" size="small" sx={{ mr: 1 }}>
                    <DeleteIcon />
                </IconButton>

                <Tooltip title="Run this test case">
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); onRun([testCase.id]) }}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                    >
                        <PlayArrowIcon />
                    </IconButton>
                </Tooltip>

                <IconButton size="small">
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>{testCase.description}</Typography>

                    <Divider sx={{ mb: 2 }} >PAYLOAD</Divider>

                    {isEditing ? (
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={payload}
                            onChange={(e) => setPayload(e.target.value)}
                            sx={{ mb: 1, bgcolor: 'background.paper' }}
                        />
                    ) : (
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.paper', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(testCase.payload, null, 2)}
                        </Paper>
                    )}

                    <Box sx={{ mt: 1, mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        {isEditing ? (
                            <Button variant="contained" size="small" onClick={handleSavePayload}>Save JSON</Button>
                        ) : (
                            <Button startIcon={<EditIcon />} size="small" onClick={() => setIsEditing(true)}>Edit Payload</Button>
                        )}
                    </Box>

                    <Divider sx={{ mb: 2 }}>REFINE WITH AGENT</Divider>

                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="E.g. 'Add a field for age' or 'Change expected status to 403'"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            sx={{ bgcolor: 'background.paper' }}
                        />
                        <Button variant="contained" endIcon={<SendIcon />} onClick={handleRefine}>
                            Refine
                        </Button>
                    </Stack>

                    {testCase.user_feedback && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">History:</Typography>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{testCase.user_feedback}</Typography>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    )
}

export default function TestReviewPanel({ testCases, onUpdateCase, onDeleteCase, onBulkDelete, onRunCases }) {
    const [selectedIds, setSelectedIds] = useState(new Set())

    if (!testCases || testCases.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>No test cases generated yet. Upload docs and click "Generate API Test Plan".</Typography>
            </Box>
        )
    }

    const handleSelect = (id) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelectedIds(newSelected)
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(testCases.map(tc => tc.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleBulkDeleteAction = async () => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Delete ${selectedIds.size} test cases?`)) return

        try {
            // Delete sequentially or parallel
            await Promise.all(Array.from(selectedIds).map(id => testCasesAPI.delete(id)))
            onBulkDelete(Array.from(selectedIds))
            setSelectedIds(new Set())
        } catch (error) {
            console.error("Bulk delete failed", error)
        }
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Review Test Plan ({testCases.length})</Typography>

                {selectedIds.size > 0 && (
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteSweepIcon />}
                        onClick={handleBulkDeleteAction}
                    >
                        Delete Selected ({selectedIds.size})
                    </Button>
                )}
                {selectedIds.size > 0 && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onRunCases(Array.from(selectedIds))}
                        sx={{ ml: 1 }}
                    >
                        Run Selected ({selectedIds.size})
                    </Button>
                )}
            </Stack>

            {/* Select All Row */}
            <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center' }}>
                <Checkbox
                    checked={testCases.length > 0 && selectedIds.size === testCases.length}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < testCases.length}
                    onChange={handleSelectAll}
                />
                <Typography variant="body2" color="text.secondary">Select All</Typography>
            </Box>

            {testCases.map(tc => (
                <TestCaseItem
                    key={tc.id}
                    testCase={tc}
                    onUpdate={onUpdateCase}
                    onDelete={onDeleteCase}
                    onRun={onRunCases}
                    selected={selectedIds.has(tc.id)}
                    onSelect={handleSelect}
                />
            ))}
        </Box>
    )
}
