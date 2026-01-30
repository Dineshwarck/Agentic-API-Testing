import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    TextField,
    Typography,
    Box,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import { projectsAPI, environmentsAPI } from '../api/endpoints';

const EnvironmentManagerDialog = ({ open, onClose, projectId, onEnvironmentsChange }) => {
    const [environments, setEnvironments] = useState([]);
    const [selectedEnvId, setSelectedEnvId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', variables: [] });
    // variables struct: [{ key: 'base_url', value: 'http://...', enabled: true }]

    useEffect(() => {
        if (open && projectId) {
            fetchEnvironments();
        }
    }, [open, projectId]);

    const fetchEnvironments = async () => {
        try {
            setLoading(true);
            const response = await environmentsAPI.list(projectId);
            setEnvironments(response.data);
            if (response.data.length > 0 && !selectedEnvId) {
                // Determine selection? No, wait for user interact
            }
        } catch (err) {
            setError('Failed to load environments');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedEnvId('NEW');
        setFormData({ name: 'New Environment', variables: [] });
        setIsEditing(true);
    };

    const handleSelect = (env) => {
        if (isEditing && selectedEnvId !== env.id) {
            if (!window.confirm("Discard unsaved changes?")) return;
        }
        setSelectedEnvId(env.id);
        const varsArray = Object.entries(env.variables || {}).map(([key, value]) => ({ key, value, enabled: true }));
        setFormData({ name: env.name, variables: varsArray });
        setIsEditing(false); // View mode initially? or always edit? Let's say always editable but needs save
    };

    const handleSave = async () => {
        try {
            const varsObj = formData.variables
                .filter(v => v.key) // Only save valid keys
                .reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {});

            const payload = {
                name: formData.name,
                variables: varsObj
            };

            if (selectedEnvId === 'NEW') {
                await environmentsAPI.create(projectId, payload);
            } else {
                await environmentsAPI.update(selectedEnvId, payload);
            }

            await fetchEnvironments();
            setIsEditing(false);
            if (selectedEnvId === 'NEW') setSelectedEnvId(null);
            onEnvironmentsChange && onEnvironmentsChange();
        } catch (err) {
            setError('Failed to save environment');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this environment?")) return;
        try {
            await environmentsAPI.delete(id);
            fetchEnvironments();
            if (selectedEnvId === id) setSelectedEnvId(null);
            onEnvironmentsChange && onEnvironmentsChange();
        } catch (err) {
            setError('Failed to delete environment');
        }
    };

    const addVariable = () => {
        setFormData({ ...formData, variables: [...formData.variables, { key: '', value: '', enabled: true }] });
        setIsEditing(true);
    };

    const updateVariable = (index, field, value) => {
        const newVars = [...formData.variables];
        newVars[index] = { ...newVars[index], [field]: value };
        setFormData({ ...formData, variables: newVars });
        setIsEditing(true);
    };

    const deleteVariable = (index) => {
        const newVars = formData.variables.filter((_, i) => i !== index);
        setFormData({ ...formData, variables: newVars });
        setIsEditing(true);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    Manage Environments
                    <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={handleCreate}>
                        Create New
                    </Button>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', p: 0 }}>
                {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                <Grid container sx={{ flex: 1, height: '100%' }}>
                    {/* List Sidebar */}
                    <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
                        <List>
                            {environments.map(env => (
                                <ListItem
                                    button
                                    key={env.id}
                                    selected={selectedEnvId === env.id}
                                    onClick={() => handleSelect(env)}
                                >
                                    <ListItemText primary={env.name} />
                                    <ListItemSecondaryAction>
                                        <IconButton size="small" onClick={() => handleDelete(env.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Grid>

                    {/* Editor Panel */}
                    <Grid item xs={8} sx={{ p: 2 }}>
                        {selectedEnvId ? (
                            <Box>
                                <TextField
                                    label="Environment Name"
                                    fullWidth
                                    margin="normal"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value });
                                        setIsEditing(true);
                                    }}
                                />
                                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Variables</Typography>
                                <Paper variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Key</TableCell>
                                                <TableCell>Value</TableCell>
                                                <TableCell width={50}></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formData.variables.map((variable, index) => (
                                                <TableRow key={index}>
                                                    <TableCell sx={{ p: 1 }}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="VARIABLE_NAME"
                                                            value={variable.key}
                                                            onChange={(e) => updateVariable(index, 'key', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ p: 1 }}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="Value"
                                                            value={variable.value}
                                                            onChange={(e) => updateVariable(index, 'value', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ p: 0.5 }}>
                                                        <IconButton size="small" onClick={() => deleteVariable(index)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <Button
                                        startIcon={<AddIcon />}
                                        fullWidth
                                        sx={{ borderRadius: 0 }}
                                        onClick={addVariable}
                                    >
                                        Add Variable
                                    </Button>
                                </Paper>

                                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                    {isEditing && (
                                        <Typography variant="caption" color="warning.main" sx={{ alignSelf: 'center' }}>
                                            Unsaved changes
                                        </Typography>
                                    )}
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveIcon />}
                                        onClick={handleSave}
                                        disabled={!isEditing}
                                    >
                                        Save
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            <Box display="flex" justifyContent="center" alignItems="center" height="100%" color="text.secondary">
                                <Typography>Select an environment to edit</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EnvironmentManagerDialog;
