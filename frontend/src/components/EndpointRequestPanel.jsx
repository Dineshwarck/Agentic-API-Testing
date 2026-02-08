import React, { useState } from 'react';
import {
    Box,
    Card,
    Tabs,
    Tab,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    Chip,
    Stack,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Divider,
} from '@mui/material';
import {
    Send as SendIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// Register JSON language for syntax highlighting
SyntaxHighlighter.registerLanguage('json', json);

/**
 * EndpointRequestPanel Component
 * 
 * Postman-like request configuration panel with tabbed interface
 * 
 * Props:
 * - endpoint: Selected endpoint object
 * - onSendRequest: (config) => void - Callback when Send button clicked
 * - response: Response object from API call
 */
const EndpointRequestPanel = ({ endpoint, onSendRequest, onUpdateEndpoint, response }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [method, setMethod] = useState(endpoint?.method || 'GET');
    const [url, setUrl] = useState(endpoint?.url || '');
    const [headers, setHeaders] = useState(endpoint?.headers || []);
    const [params, setParams] = useState([]);
    const [body, setBody] = useState(JSON.stringify(endpoint?.body_schema || {}, null, 2));
    const [authType, setAuthType] = useState('none');

    // Auth State
    const [bearerToken, setBearerToken] = useState('');
    const [basicUsername, setBasicUsername] = useState('');
    const [basicPassword, setBasicPassword] = useState('');
    const [apiKeyKey, setApiKeyKey] = useState('');
    const [apiKeyValue, setApiKeyValue] = useState('');
    const [apiKeyAddTo, setApiKeyAddTo] = useState('header');

    React.useEffect(() => {
        if (endpoint) {
            setMethod(endpoint.method || 'GET');
            setUrl(endpoint.url || '');
            setHeaders(
                Object.entries(endpoint.headers || {}).map(([key, value]) => ({ key, value, enabled: true }))
            );

            // Load Parameters (Query)
            if (endpoint.parameters && Array.isArray(endpoint.parameters)) {
                const queryParams = endpoint.parameters
                    .filter(p => p.in === 'query')
                    .map(p => ({
                        key: p.name,
                        value: p.schema?.default || '',
                        enabled: true
                    }));
                setParams(queryParams);
            } else {
                setParams([]);
            }

            setBody(JSON.stringify(endpoint.body_schema || {}, null, 2));

            // Initialize auth if saved (future proofing)
            if (endpoint.auth_config) {
                const config = endpoint.auth_config;
                setAuthType(config.type || 'none');
                if (config.type === 'bearer') setBearerToken(config.token || '');
                if (config.type === 'basic') {
                    setBasicUsername(config.username || '');
                    setBasicPassword(config.password || '');
                }
                if (config.type === 'apikey') {
                    setApiKeyKey(config.key || '');
                    setApiKeyValue(config.value || '');
                    setApiKeyAddTo(config.addTo || 'header');
                }
            }
        }
    }, [endpoint]);

    const handleSend = () => {
        let requestHeaders = headers
            .filter(h => h.enabled && h.key)
            .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

        let requestParams = params
            .filter(p => p.enabled && p.key)
            .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {});

        // Inject Auth
        if (authType === 'bearer' && bearerToken) {
            requestHeaders['Authorization'] = `Bearer ${bearerToken}`;
        } else if (authType === 'basic' && basicUsername) {
            const credentials = btoa(`${basicUsername}:${basicPassword}`);
            requestHeaders['Authorization'] = `Basic ${credentials}`;
        } else if (authType === 'apikey' && apiKeyKey && apiKeyValue) {
            if (apiKeyAddTo === 'header') {
                requestHeaders[apiKeyKey] = apiKeyValue;
            } else { // query
                requestParams[apiKeyKey] = apiKeyValue;
            }
        }

        const requestConfig = {
            method,
            url,
            headers: requestHeaders,
            params: requestParams,
            body: method !== 'GET' && method !== 'HEAD' ? JSON.parse(body || '{}') : undefined,
        };
        onSendRequest && onSendRequest(requestConfig);
    };

    const addHeader = () => {
        setHeaders([...headers, { key: '', value: '', enabled: true }]);
    };

    const updateHeader = (index, field, value) => {
        const newHeaders = [...headers];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        setHeaders(newHeaders);
    };

    const deleteHeader = (index) => {
        setHeaders(headers.filter((_, i) => i !== index));
    };

    const addParam = () => {
        setParams([...params, { key: '', value: '', enabled: true }]);
    };

    const updateParam = (index, field, value) => {
        const newParams = [...params];
        newParams[index] = { ...newParams[index], [field]: value };
        setParams(newParams);
    };

    const deleteParam = (index) => {
        setParams(params.filter((_, i) => i !== index));
    };

    if (!endpoint) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                }}
            >
                <Typography variant="h6">Select an endpoint to get started</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* URL Bar */}
            <Card elevation={1} sx={{ p: 2, borderRadius: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl sx={{ minWidth: 100 }}>
                        <Select value={method} onChange={(e) => setMethod(e.target.value)} size="small">
                            <MenuItem value="GET">GET</MenuItem>
                            <MenuItem value="POST">POST</MenuItem>
                            <MenuItem value="PUT">PUT</MenuItem>
                            <MenuItem value="DELETE">DELETE</MenuItem>
                            <MenuItem value="PATCH">PATCH</MenuItem>
                            <MenuItem value="HEAD">HEAD</MenuItem>
                            <MenuItem value="OPTIONS">OPTIONS</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter request URL"
                        size="small"
                    />
                    <Button
                        variant="contained"
                        startIcon={<SendIcon />}
                        onClick={handleSend}
                        sx={{ minWidth: 100 }}
                    >
                        Send
                    </Button>
                </Stack>
            </Card>

            {/* Tabs and Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab label="Docs" />
                    <Tab label="Params" />
                    <Tab label="Authorization" />
                    <Tab label="Headers" />
                    <Tab label="Body" />
                    <Tab label="Settings" />
                </Tabs>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {/* Docs Tab */}
                    {activeTab === 0 && (
                        <Stack spacing={2}>
                            <Typography variant="h6">{endpoint.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {endpoint.description || 'No description available'}
                            </Typography>
                            {endpoint.operation_id && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Operation ID:
                                    </Typography>
                                    <Typography variant="body2">{endpoint.operation_id}</Typography>
                                </Box>
                            )}
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => {
                                    const authConfig = {
                                        type: authType,
                                        token: authType === 'bearer' ? bearerToken : undefined,
                                        username: authType === 'basic' ? basicUsername : undefined,
                                        password: authType === 'basic' ? basicPassword : undefined,
                                        key: authType === 'apikey' ? apiKeyKey : undefined,
                                        value: authType === 'apikey' ? apiKeyValue : undefined,
                                        addTo: authType === 'apikey' ? apiKeyAddTo : undefined,
                                    };
                                    onUpdateEndpoint && onUpdateEndpoint(endpoint.id, { auth_config: authConfig });
                                }}
                                sx={{ mt: 2 }}
                            >
                                Save Auth Config
                            </Button>
                        </Stack>
                    )}

                    {/* Params Tab */}
                    {activeTab === 1 && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle2">Query Parameters</Typography>
                                <Button startIcon={<AddIcon />} size="small" onClick={addParam}>
                                    Add Param
                                </Button>
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={40}></TableCell>
                                        <TableCell>Key</TableCell>
                                        <TableCell>Value</TableCell>
                                        <TableCell width={50}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {params.map((param, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={param.enabled}
                                                    onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    value={param.key}
                                                    onChange={(e) => updateParam(index, 'key', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    value={param.value}
                                                    onChange={(e) => updateParam(index, 'value', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => deleteParam(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}

                    {/* Authorization Tab */}
                    {activeTab === 2 && (
                        <Stack spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>Auth Type</InputLabel>
                                <Select value={authType} onChange={(e) => setAuthType(e.target.value)}>
                                    <MenuItem value="none">No Auth</MenuItem>
                                    <MenuItem value="bearer">Bearer Token</MenuItem>
                                    <MenuItem value="basic">Basic Auth</MenuItem>
                                    <MenuItem value="apikey">API Key</MenuItem>
                                </Select>
                            </FormControl>
                            {authType === 'bearer' && (
                                <TextField
                                    fullWidth
                                    label="Token"
                                    placeholder="Enter bearer token"
                                    value={bearerToken}
                                    onChange={(e) => setBearerToken(e.target.value)}
                                />
                            )}
                            {authType === 'basic' && (
                                <>
                                    <TextField
                                        fullWidth
                                        label="Username"
                                        value={basicUsername}
                                        onChange={(e) => setBasicUsername(e.target.value)}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Password"
                                        type="password"
                                        value={basicPassword}
                                        onChange={(e) => setBasicPassword(e.target.value)}
                                    />
                                </>
                            )}
                            {authType === 'apikey' && (
                                <>
                                    <TextField
                                        fullWidth
                                        label="Key"
                                        value={apiKeyKey}
                                        onChange={(e) => setApiKeyKey(e.target.value)}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Value"
                                        value={apiKeyValue}
                                        onChange={(e) => setApiKeyValue(e.target.value)}
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>Add To</InputLabel>
                                        <Select
                                            value={apiKeyAddTo}
                                            onChange={(e) => setApiKeyAddTo(e.target.value)}
                                            size="small"
                                        >
                                            <MenuItem value="header">Header</MenuItem>
                                            <MenuItem value="query">Query Params</MenuItem>
                                        </Select>
                                    </FormControl>
                                </>
                            )}
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => {
                                    const authConfig = {
                                        type: authType,
                                        token: authType === 'bearer' ? bearerToken : undefined,
                                        username: authType === 'basic' ? basicUsername : undefined,
                                        password: authType === 'basic' ? basicPassword : undefined,
                                        key: authType === 'apikey' ? apiKeyKey : undefined,
                                        value: authType === 'apikey' ? apiKeyValue : undefined,
                                        addTo: authType === 'apikey' ? apiKeyAddTo : undefined,
                                    };
                                    onUpdateEndpoint && onUpdateEndpoint(endpoint.id, { auth_config: authConfig });
                                }}
                                sx={{ mt: 2 }}
                            >
                                Save Auth Config
                            </Button>
                        </Stack>
                    )}

                    {/* Headers Tab */}
                    {activeTab === 3 && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle2">Headers</Typography>
                                <Button startIcon={<AddIcon />} size="small" onClick={addHeader}>
                                    Add Header
                                </Button>
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={40}></TableCell>
                                        <TableCell>Key</TableCell>
                                        <TableCell>Value</TableCell>
                                        <TableCell width={50}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {headers.map((header, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={header.enabled}
                                                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    value={header.key}
                                                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    value={header.value}
                                                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => deleteHeader(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}

                    {/* Body Tab */}
                    {activeTab === 4 && (
                        <Box>
                            <TextField
                                fullWidth
                                multiline
                                rows={12}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder='{"key": "value"}'
                                disabled={method === 'GET' || method === 'HEAD'}
                                sx={{ fontFamily: 'monospace' }}
                            />
                        </Box>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 5 && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Additional request settings coming soon...
                            </Typography>
                        </Stack>
                    )}
                </Box>

                {/* Response Section */}
                {response && (
                    <>
                        <Divider />
                        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                <Typography variant="subtitle2">Response</Typography>
                                <Chip
                                    label={`Status: ${response.status}`}
                                    color={response.status < 300 ? 'success' : 'error'}
                                    size="small"
                                />
                                {response.time && (
                                    <Chip label={`${response.time}ms`} size="small" variant="outlined" />
                                )}
                                {response.size && (
                                    <Chip label={`${response.size}KB`} size="small" variant="outlined" />
                                )}
                            </Stack>
                            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                <SyntaxHighlighter
                                    language="json"
                                    style={vs2015}
                                    customStyle={{ margin: 0, fontSize: 12 }}
                                >
                                    {JSON.stringify(response.data, null, 2)}
                                </SyntaxHighlighter>
                            </Paper>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default EndpointRequestPanel;
