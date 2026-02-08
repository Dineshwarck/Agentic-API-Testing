import React, { useState, useEffect } from 'react'
import {
    Container, Typography, Box, Paper, Grid,
    TextField, MenuItem, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import axios from 'axios'
import AppButton from '../components/AppButton'

const PROVIDER_TYPES = [
    { value: 'GEMINI', label: 'Google Gemini' },
    { value: 'OPENAI', label: 'OpenAI Compatible (Groq, AIPipe, etc.)' }
]

export default function SettingsPage() {
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [openDialog, setOpenDialog] = useState(false)
    const [editingId, setEditingId] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        provider_type: 'OPENAI',
        base_url: '',
        api_key: '',
        default_model: '',
        is_active: false
    })

    useEffect(() => {
        fetchProviders()
    }, [])

    const fetchProviders = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8001/api/llm-providers')
            setProviders(res.data)
        } catch (err) {
            setError('Failed to load providers')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            if (editingId) {
                // Remove api_key if it's empty to avoid overwriting existing key
                const payload = { ...formData }
                if (!payload.api_key) {
                    delete payload.api_key
                }
                await axios.put(`http://127.0.0.1:8001/api/llm-providers/${editingId}`, payload)
            } else {
                await axios.post('http://127.0.0.1:8001/api/llm-providers', formData)
            }
            setOpenDialog(false)
            fetchProviders()
        } catch (err) {
            alert('Error saving provider: ' + err.message)
        }
    }

    const handleEdit = (provider) => {
        setFormData({
            name: provider.name,
            provider_type: provider.provider_type,
            base_url: provider.base_url || '',
            api_key: '', // Don't show existing key for security, user normally overwrites or leaves blank if backend supports partial updates.
            // However, for this simple UI, we might need to ask the user to re-enter it or handle it carefully.
            // If backend requires api_key regarding valid schema, we might need it.
            // Let's assume we populate what we have, but usually API keys are hidden.
            // If the backend model returns the key (which is bad practice but possible here), we can use it.
            // Looking at backend code, it returns LLMProviderSchema.
            default_model: provider.default_model,
            is_active: provider.is_active
        })
        // If the API returns the key, use it. If not, the user has to re-enter it if they want to change it,
        // OR the backend should handle partial updates where api_key can be optional.
        // For 'LLMProviderUpdateSchema', we should check if api_key is optional.
        // Given I cannot see schema definition fully, I will assume user might need to re-enter it or I'll just leave it empty.
        // If I leave it empty, and backend requires it, update will fail.
        // Let's populate it if it's in the provider object from the list.
        if (provider.api_key) {
            setFormData(prev => ({ ...prev, api_key: provider.api_key }))
        }

        setEditingId(provider.id)
        setOpenDialog(true)
    }

    const handleActivate = async (id) => {
        try {
            await axios.post(`http://127.0.0.1:8001/api/llm-providers/${id}/activate`)
            fetchProviders()
        } catch (err) {
            alert('Error activating provider')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return
        try {
            await axios.delete(`http://127.0.0.1:8001/api/llm-providers/${id}`)
            fetchProviders()
        } catch (err) {
            alert('Error deleting provider')
        }
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="600">Settings</Typography>
                <AppButton startIcon={<AddIcon />} onClick={() => {
                    setFormData({ name: '', provider_type: 'OPENAI', base_url: '', api_key: '', default_model: '', is_active: false })
                    setEditingId(null)
                    setOpenDialog(true)
                }}>
                    Add Provider
                </AppButton>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>LLM Providers</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Base URL</TableCell>
                                <TableCell>Model</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {providers.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                                    <TableCell>{p.provider_type}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85em' }}>{p.base_url || '-'}</TableCell>
                                    <TableCell>{p.default_model}</TableCell>
                                    <TableCell>
                                        {p.is_active ? (
                                            <Chip label="Active" color="success" size="small" icon={<CheckCircleIcon />} />
                                        ) : (
                                            <IconButton size="small" onClick={() => handleActivate(p.id)} title="Set Active">
                                                <RadioButtonUncheckedIcon color="action" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="primary" onClick={() => handleEdit(p)} sx={{ mr: 1 }}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {providers.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No providers configured.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit LLM Provider' : 'Configure LLM Provider'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Name"
                                fullWidth
                                placeholder="e.g. Groq Production"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                label="Provider Type"
                                fullWidth
                                value={formData.provider_type}
                                onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
                            >
                                {PROVIDER_TYPES.map(op => (
                                    <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        {formData.provider_type === 'OPENAI' && (
                            <Grid item xs={12}>
                                <TextField
                                    label="Base URL"
                                    fullWidth
                                    placeholder="https://api.groq.com/openai/v1"
                                    helperText="Required for Groq, AIPipe, etc."
                                    value={formData.base_url}
                                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                />
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <TextField
                                label="API Key"
                                fullWidth
                                placeholder="sk-..."
                                value={formData.api_key}
                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Default Model"
                                fullWidth
                                placeholder={formData.provider_type === 'GEMINI' ? 'models/gemini-flash-latest' : 'llama3-70b-8192'}
                                value={formData.default_model}
                                onChange={(e) => setFormData({ ...formData, default_model: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <AppButton onClick={handleSave}>Save Configuration</AppButton>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
