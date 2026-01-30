import React, { useState, useEffect } from 'react';
import {
    FormControl,
    Select,
    MenuItem,
    Typography,
    Box,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { environmentsAPI } from '../api/endpoints';
import EnvironmentManagerDialog from './EnvironmentManagerDialog';

const EnvironmentSelector = ({ projectId, onEnvironmentChange, activeEnvironmentId }) => {
    const [environments, setEnvironments] = useState([]);
    const [selectedEnvId, setSelectedEnvId] = useState('none');
    const [managerOpen, setManagerOpen] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchEnvironments();
        }
    }, [projectId]);

    useEffect(() => {
        if (activeEnvironmentId) {
            setSelectedEnvId(activeEnvironmentId);
        }
    }, [activeEnvironmentId]);

    const fetchEnvironments = async () => {
        try {
            const response = await environmentsAPI.list(projectId);
            setEnvironments(response.data);

            // Auto-select if not set? No, safer to default to No Environment
        } catch (err) {
            console.error('Failed to fetch environments', err);
        }
    };

    const handleChange = (e) => {
        const id = e.target.value;
        setSelectedEnvId(id);
        const env = environments.find(e => e.id === id);
        onEnvironmentChange && onEnvironmentChange(env || null);
    };

    return (
        <Box display="flex" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150, mr: 1 }}>
                <Select
                    value={selectedEnvId}
                    onChange={handleChange}
                    displayEmpty
                    renderValue={(selected) => {
                        if (selected === 'none') return <Typography variant="body2" color="text.secondary">No Environment</Typography>;
                        const env = environments.find(e => e.id === selected);
                        return env ? env.name : 'Unknown';
                    }}
                >
                    <MenuItem value="none">
                        <Typography variant="body2" color="text.secondary">No Environment</Typography>
                    </MenuItem>
                    {environments.map(env => (
                        <MenuItem key={env.id} value={env.id}>
                            {env.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Tooltip title="Manage Environments">
                <IconButton size="small" onClick={() => setManagerOpen(true)}>
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <EnvironmentManagerDialog
                open={managerOpen}
                onClose={() => setManagerOpen(false)}
                projectId={projectId}
                onEnvironmentsChange={fetchEnvironments}
            />
        </Box>
    );
};

export default EnvironmentSelector;
