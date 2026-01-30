import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Divider,
    IconButton,
    Chip,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

/**
 * AssertionBuilder Component
 * 
 * Reusable component for building test assertions
 * 
 * Props:
 * - assertions: Array of assertion objects
 * - onChange: (assertions) => void
 */
const AssertionBuilder = ({ assertions, onChange }) => {
    const addAssertion = () => {
        onChange([
            ...assertions,
            {
                type: 'status_code',
                operator: 'equals',
                value: '',
            },
        ]);
    };

    const updateAssertion = (index, field, value) => {
        const newAssertions = [...assertions];
        newAssertions[index] = { ...newAssertions[index], [field]: value };
        onChange(newAssertions);
    };

    const deleteAssertion = (index) => {
        onChange(assertions.filter((_, i) => i !== index));
    };

    const getAssertionLabel = (assertion) => {
        switch (assertion.type) {
            case 'status_code':
                return `Status Code ${assertion.operator} ${assertion.value}`;
            case 'json_path':
                return `${assertion.path} ${assertion.operator}${assertion.value ? ` ${assertion.value}` : ''}`;
            case 'response_time':
                return `Response Time ${assertion.operator} ${assertion.value}ms`;
            case 'header':
                return `Header ${assertion.key} ${assertion.operator} ${assertion.value}`;
            default:
                return 'Assertion';
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2">Assertions</Typography>
                <Button startIcon={<AddIcon />} size="small" onClick={addAssertion}>
                    Add Assertion
                </Button>
            </Stack>

            <Stack spacing={2}>
                {assertions.map((assertion, index) => (
                    <Box
                        key={index}
                        sx={{
                            p: 2,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Chip label={`Assertion ${index + 1}`} size="small" />
                            <IconButton size="small" onClick={() => deleteAssertion(index)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>

                        <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={assertion.type}
                                    label="Type"
                                    onChange={(e) => updateAssertion(index, 'type', e.target.value)}
                                >
                                    <MenuItem value="status_code">Status Code</MenuItem>
                                    <MenuItem value="json_path">JSON Path</MenuItem>
                                    <MenuItem value="response_time">Response Time</MenuItem>
                                    <MenuItem value="header">Header Value</MenuItem>
                                </Select>
                            </FormControl>

                            {assertion.type === 'json_path' && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="JSON Path"
                                    placeholder="$.data.id"
                                    value={assertion.path || ''}
                                    onChange={(e) => updateAssertion(index, 'path', e.target.value)}
                                />
                            )}

                            {assertion.type === 'header' && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Header Key"
                                    placeholder="Content-Type"
                                    value={assertion.key || ''}
                                    onChange={(e) => updateAssertion(index, 'key', e.target.value)}
                                />
                            )}

                            <FormControl fullWidth size="small">
                                <InputLabel>Operator</InputLabel>
                                <Select
                                    value={assertion.operator}
                                    label="Operator"
                                    onChange={(e) => updateAssertion(index, 'operator', e.target.value)}
                                >
                                    <MenuItem value="equals">Equals</MenuItem>
                                    <MenuItem value="not_equals">Not Equals</MenuItem>
                                    {assertion.type === 'json_path' && (
                                        <>
                                            <MenuItem value="exists">Exists</MenuItem>
                                            <MenuItem value="contains">Contains</MenuItem>
                                        </>
                                    )}
                                    {assertion.type === 'response_time' && (
                                        <>
                                            <MenuItem value="less_than">Less Than</MenuItem>
                                            <MenuItem value="greater_than">Greater Than</MenuItem>
                                        </>
                                    )}
                                </Select>
                            </FormControl>

                            {assertion.operator !== 'exists' && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Value"
                                    placeholder={assertion.type === 'response_time' ? '1000' : 'Expected value'}
                                    value={assertion.value || ''}
                                    onChange={(e) => updateAssertion(index, 'value', e.target.value)}
                                />
                            )}
                        </Stack>
                    </Box>
                ))}

                {assertions.length === 0 && (
                    <Alert severity="info">
                        No assertions added yet. Click "Add Assertion" to create validation rules for this test case.
                    </Alert>
                )}
            </Stack>
        </Box>
    );
};

/**
 * ManualTestCreatorDrawer Component
 * 
 * Right-side drawer for manually creating test cases
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onTestCreated: (test) => void
 * - endpoints: Array of endpoint objects
 */
const ManualTestCreatorDrawer = ({ open, onClose, onTestCreated, endpoints = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'FUNCTIONAL',
        endpoint_id: '',
        expected_status: 200,
        payload: JSON.stringify({
            method: 'POST',
            url: '/api/endpoint',
            headers: {
                'Content-Type': 'application/json',
            },
            body: {},
        }, null, 2),
        assertions: [],
    });

    const [errors, setErrors] = useState({});

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!formData.endpoint_id) {
            newErrors.endpoint_id = 'Please select an endpoint';
        }

        if (!formData.expected_status || formData.expected_status < 100 || formData.expected_status > 599) {
            newErrors.expected_status = 'Status code must be between 100 and 599';
        }

        try {
            JSON.parse(formData.payload);
        } catch (e) {
            newErrors.payload = 'Invalid JSON format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = () => {
        if (!validate()) {
            return;
        }

        const newTest = {
            id: `tc-manual-${Date.now()}`,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            status: 'DRAFT',
            expected_status: formData.expected_status,
            endpoint: formData.endpoint_id,
            endpoint_name: endpoints.find(e => e.id === formData.endpoint_id)?.name || '',
            payload: JSON.parse(formData.payload),
            assertions: formData.assertions,
            created_by: 'manual',
            reviewer_info: null,
        };

        onTestCreated(newTest);
        handleClose();
    };

    const handleClose = () => {
        // Reset form
        setFormData({
            title: '',
            description: '',
            category: 'FUNCTIONAL',
            endpoint_id: '',
            expected_status: 200,
            payload: JSON.stringify({
                method: 'POST',
                url: '/api/endpoint',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {},
            }, null, 2),
            assertions: [],
        });
        setErrors({});
        onClose();
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={handleClose}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 1, // Above AppBar (1301)
                '& .MuiDrawer-paper': {
                    width: 600,
                    maxWidth: '90vw',
                },
            }}
        >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Create Test Case</Typography>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Box>

                {/* Form Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                    <Stack spacing={3}>
                        {/* Title */}
                        <TextField
                            fullWidth
                            label="Test Case Title"
                            placeholder="e.g., Create user with valid data"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            error={!!errors.title}
                            helperText={errors.title}
                            required
                        />

                        {/* Description */}
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            placeholder="Describe what this test case validates..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                        />

                        {/* Category */}
                        <FormControl fullWidth required>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category}
                                label="Category"
                                onChange={(e) => handleChange('category', e.target.value)}
                            >
                                <MenuItem value="FUNCTIONAL">Functional</MenuItem>
                                <MenuItem value="VALIDATION">Validation</MenuItem>
                                <MenuItem value="SECURITY">Security</MenuItem>
                                <MenuItem value="UX_ERROR">UX/Error Handling</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Endpoint */}
                        <FormControl fullWidth required error={!!errors.endpoint_id}>
                            <InputLabel>Endpoint</InputLabel>
                            <Select
                                value={formData.endpoint_id}
                                label="Endpoint"
                                onChange={(e) => handleChange('endpoint_id', e.target.value)}
                            >
                                {endpoints.map(endpoint => (
                                    <MenuItem key={endpoint.id} value={endpoint.id}>
                                        {endpoint.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.endpoint_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                                    {errors.endpoint_id}
                                </Typography>
                            )}
                        </FormControl>

                        {/* Expected Status Code */}
                        <TextField
                            fullWidth
                            type="number"
                            label="Expected Status Code"
                            value={formData.expected_status}
                            onChange={(e) => handleChange('expected_status', parseInt(e.target.value))}
                            error={!!errors.expected_status}
                            helperText={errors.expected_status || 'HTTP status code (e.g., 200, 201, 400)'}
                            required
                            InputProps={{
                                inputProps: { min: 100, max: 599 }
                            }}
                        />

                        <Divider />

                        {/* Request Payload */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Request Payload
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={15}
                                value={formData.payload}
                                onChange={(e) => handleChange('payload', e.target.value)}
                                error={!!errors.payload}
                                helperText={errors.payload || 'JSON format required'}
                                sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                                placeholder='{\n  "method": "POST",\n  "url": "/api/users",\n  "headers": {},\n  "body": {}\n}'
                            />
                        </Box>

                        <Divider />

                        {/* Assertions */}
                        <AssertionBuilder
                            assertions={formData.assertions}
                            onChange={(assertions) => handleChange('assertions', assertions)}
                        />
                    </Stack>
                </Box>

                {/* Footer */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={handleCreate}>
                            Create Test Case
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </Drawer>
    );
};

export default ManualTestCreatorDrawer;
export { AssertionBuilder };
