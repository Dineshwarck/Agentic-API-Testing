import React, { useState } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    Typography,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Checkbox,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
    Search as SearchIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    ExpandMore,
    ChevronRight,
    MoreVert,
    Api as ApiIcon,
} from '@mui/icons-material';

/**
 * CollectionTree Component
 * 
 * Hierarchical tree view for Collections and Endpoints (Postman-like sidebar)
 * 
 * Props:
 * - collections: Array of collection objects with nested endpoints
 * - onEndpointSelect: (endpoint) => void
 * - selectedEndpointId: string
 * - selectMode: boolean - Enable checkbox selection mode
 * - selectedEndpoints: Array of endpoint IDs
 * - onEndpointSelection: (endpointId) => void
 */
const CollectionTree = ({
    collections = [],
    onEndpointSelect,
    selectedEndpointId,
    selectMode = false,
    selectedEndpoints = [],
    onEndpointSelection
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);

    // Filter collections and endpoints based on search
    const filteredCollections = collections.map(collection => {
        if (!searchTerm) return collection;

        const matchingEndpoints = collection.endpoints.filter(endpoint =>
            endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpoint.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpoint.method.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (
            collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matchingEndpoints.length > 0
        ) {
            return { ...collection, endpoints: matchingEndpoints };
        }

        return null;
    }).filter(Boolean);

    const handleToggle = (event, nodeIds) => {
        setExpanded(nodeIds);
    };

    const handleEndpointClick = (endpoint) => {
        onEndpointSelect && onEndpointSelect(endpoint);
    };

    const handleContextMenu = (event, node) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ mouseX: event.clientX, mouseY: event.clientY });
        setSelectedNode(node);
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    // Method colors
    const getMethodColor = (method) => {
        const colors = {
            GET: 'success',
            POST: 'primary',
            PUT: 'warning',
            DELETE: 'error',
            PATCH: 'info',
            HEAD: 'default',
            OPTIONS: 'default',
        };
        return colors[method] || 'default';
    };

    // Auto-expand search results
    React.useEffect(() => {
        if (searchTerm && filteredCollections.length > 0) {
            const expandedIds = filteredCollections.map(c => `collection-${c.id}`);
            setExpanded(expandedIds);
        }
    }, [searchTerm, filteredCollections]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Search Box */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search collections & endpoints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Tree View */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {filteredCollections.length === 0 ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        sx={{ mt: 4 }}
                    >
                        {searchTerm ? 'No results found' : 'No collections available'}
                    </Typography>
                ) : (
                    <SimpleTreeView
                        expandedItems={expanded}
                        selectedItems={selectedEndpointId ? `endpoint-${selectedEndpointId}` : ''}
                        onExpandedItemsChange={(event, itemIds) => setExpanded(itemIds)}
                        slots={{
                            collapseIcon: ExpandMore,
                            expandIcon: ChevronRight,
                        }}
                        sx={{
                            '& .MuiTreeItem-content': {
                                borderRadius: 1,
                                my: 0.5,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            },
                            '& .Mui-selected': {
                                bgcolor: 'action.selected !important',
                            },
                        }}
                    >
                        {filteredCollections.map((collection) => (
                            <TreeItem
                                key={`collection-${collection.id}`}
                                itemId={`collection-${collection.id}`}
                                label={
                                    <Box
                                        sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}
                                        onContextMenu={(e) => handleContextMenu(e, { type: 'collection', data: collection })}
                                    >
                                        {expanded.includes(`collection-${collection.id}`) ? (
                                            <FolderOpenIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                                        ) : (
                                            <FolderIcon sx={{ mr: 1, fontSize: 20, color: 'action.active' }} />
                                        )}
                                        <Typography variant="body2" sx={{ flex: 1 }}>
                                            {collection.name}
                                        </Typography>
                                        <Chip
                                            label={collection.endpoints.length}
                                            size="small"
                                            sx={{ height: 20, fontSize: 11, mr: 0.5 }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleContextMenu(e, { type: 'collection', data: collection })}
                                            sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                        >
                                            <MoreVert fontSize="small" />
                                        </IconButton>
                                    </Box>
                                }
                            >
                                {collection.endpoints.map((endpoint) => (
                                    <TreeItem
                                        key={`endpoint-${endpoint.id}`}
                                        itemId={`endpoint-${endpoint.id}`}
                                        label={
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    py: 0.5,
                                                    cursor: 'pointer',
                                                }}
                                                onClick={(e) => {
                                                    if (selectMode) {
                                                        e.stopPropagation();
                                                        onEndpointSelection(endpoint.id);
                                                    } else {
                                                        handleEndpointClick(endpoint);
                                                    }
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, { type: 'endpoint', data: endpoint })}
                                            >
                                                {selectMode && (
                                                    <Checkbox
                                                        checked={selectedEndpoints.includes(endpoint.id)}
                                                        size="small"
                                                        sx={{ p: 0, mr: 1 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEndpointSelection(endpoint.id);
                                                        }}
                                                    />
                                                )}
                                                <ApiIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                                <Chip
                                                    label={endpoint.method}
                                                    size="small"
                                                    color={getMethodColor(endpoint.method)}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        mr: 1,
                                                        minWidth: 50,
                                                    }}
                                                />
                                                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                                    {endpoint.name}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                ))}
                            </TreeItem>
                        ))}
                    </SimpleTreeView>
                )}
            </Box>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                {selectedNode?.type === 'collection' ? (
                    [
                        <MenuItem key="rename" onClick={handleCloseContextMenu}>
                            Rename Collection
                        </MenuItem>,
                        <MenuItem key="new" onClick={handleCloseContextMenu}>
                            New Endpoint
                        </MenuItem>,
                        <MenuItem key="delete" onClick={handleCloseContextMenu}>
                            Delete Collection
                        </MenuItem>,
                    ]
                ) : (
                    [
                        <MenuItem key="edit" onClick={handleCloseContextMenu}>
                            Edit Endpoint
                        </MenuItem>,
                        <MenuItem key="duplicate" onClick={handleCloseContextMenu}>
                            Duplicate
                        </MenuItem>,
                        <MenuItem key="delete" onClick={handleCloseContextMenu}>
                            Delete Endpoint
                        </MenuItem>,
                    ]
                )}
            </Menu>
        </Box>
    );
};

export default CollectionTree;
