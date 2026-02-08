import {
    Drawer,
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    IconButton,
    Typography,
    Collapse,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
    InputBase
} from '@mui/material'
import {
    Settings as SettingsIcon,
    ExpandLess,
    ExpandMore,
    Add as AddIcon
} from '@mui/icons-material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsAPI, endpointsAPI } from '../api/endpoints'
import { useEffect } from 'react'

const DRAWER_WIDTH = 240

function WorkspaceSidebar({ open }) {
    const navigate = useNavigate()
    const [selectedProject, setSelectedProject] = useState('project-1')
    const [selectedEndpoint, setSelectedEndpoint] = useState('endpoint-1')
    const [openProjects, setOpenProjects] = useState(['project-1'])
    const [contextMenu, setContextMenu] = useState(null)
    const [contextItem, setContextItem] = useState(null)

    const [projects, setProjects] = useState([])

    // Fetch projects and their endpoints
    useEffect(() => {
        loadProjects()
    }, [])

    const loadProjects = async () => {
        try {
            const projectsResponse = await projectsAPI.list()
            setProjects(projectsResponse.data)
        } catch (error) {
            console.error('Failed to load projects:', error)
        }
    }

    const handleProjectClick = (projectId) => {
        setSelectedProject(projectId)
        if (openProjects.includes(projectId)) {
            setOpenProjects(openProjects.filter(id => id !== projectId))
        } else {
            setOpenProjects([...openProjects, projectId])
        }
    }

    const handleEndpointClick = (endpointId) => {
        setSelectedEndpoint(endpointId)
        navigate(`/testing-workbench/${endpointId}`)
    }

    const [editingItem, setEditingItem] = useState(null) // { type: 'project'|'endpoint', id: string }
    const [tempName, setTempName] = useState('')

    const handleAddProject = async () => {
        try {
            const defaultName = `Project_${Date.now().toString().slice(-4)}`
            const response = await projectsAPI.create({ name: defaultName })
            const newProject = { ...response.data, endpoints: [] }
            setProjects([...projects, newProject])

            // Start editing immediately
            setEditingItem({ type: 'project', id: newProject.id })
            setTempName(defaultName)
            setOpenProjects([...openProjects, newProject.id])
        } catch (error) {
            console.error('Failed to create project:', error)
        }
    }

    const handleAddEndpoint = async (projectId) => {
        try {
            const defaultName = `Endpoint_${Date.now().toString().slice(-4)}`
            const response = await projectsAPI.createEndpoint(projectId, {
                name: defaultName,
                url: 'https://api.example.com',
                method: 'GET'
            })
            const newEndpoint = response.data

            // Update local state
            setProjects(projects.map(p => {
                if (p.id === projectId) {
                    return { ...p, endpoints: [...(p.endpoints || []), newEndpoint] }
                }
                return p
            }))

            // Start editing
            setEditingItem({ type: 'endpoint', id: newEndpoint.id })
            setTempName(defaultName)

            // Ensure project is open
            if (!openProjects.includes(projectId)) {
                setOpenProjects([...openProjects, projectId])
            }
        } catch (error) {
            console.error('Failed to create endpoint:', error)
        }
    }

    const handleEditKeyDown = async (e) => {
        if (e.key === 'Enter') {
            await handleEditSave()
        } else if (e.key === 'Escape') {
            setEditingItem(null)
            setTempName('')
        }
    }

    const handleEditSave = async () => {
        if (!editingItem || !tempName.trim()) {
            setEditingItem(null)
            return
        }

        try {
            if (editingItem.type === 'project') {
                await projectsAPI.update(editingItem.id, { name: tempName })
                setProjects(projects.map(p =>
                    p.id === editingItem.id ? { ...p, name: tempName } : p
                ))
            } else if (editingItem.type === 'endpoint') {
                await endpointsAPI.update(editingItem.id, { name: tempName })
                setProjects(projects.map(p => ({
                    ...p,
                    endpoints: p.endpoints ? p.endpoints.map(e =>
                        e.id === editingItem.id ? { ...e, name: tempName } : e
                    ) : []
                })))
            }
        } catch (error) {
            console.error('Failed to save name:', error)
        } finally {
            setEditingItem(null)
            setTempName('')
        }
    }

    const handleSettingsClick = () => {
        navigate('/settings') // Navigate to settings page
    }

    const startRenaming = (type, id, currentName) => {
        setEditingItem({ type, id })
        setTempName(currentName)
        setContextMenu(null)
    }

    // Context menu handlers
    const handleContextMenu = (event, item) => {
        event.preventDefault()
        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
        })
        setContextItem(item)
    }

    const handleContextClose = () => {
        setContextMenu(null)
        setContextItem(null)
    }

    const handleRename = () => {
        if (contextItem) {
            // Delay renaming to allow menu clear transition/focus restore to complete
            setTimeout(() => {
                startRenaming(contextItem.type, contextItem.id, contextItem.name)
            }, 100)
        }
        handleContextClose()
    }

    const handleDelete = async () => {
        if (!contextItem) return

        try {
            if (contextItem.type === 'project') {
                await projectsAPI.delete(contextItem.id)
                setProjects(projects.filter(p => p.id !== contextItem.id))
                if (selectedProject === contextItem.id) {
                    setSelectedProject(null)
                    setSelectedEndpoint(null)
                }
            } else if (contextItem.type === 'endpoint') {
                await endpointsAPI.delete(contextItem.id)
                setProjects(projects.map(p => {
                    if (p.id === contextItem.projectId) { // Need to ensure projectId is passed in contextItem
                        return {
                            ...p,
                            endpoints: p.endpoints.filter(e => e.id !== contextItem.id)
                        }
                    }
                    return p
                }))
                if (selectedEndpoint === contextItem.id) {
                    setSelectedEndpoint(null)
                }
            }
        } catch (error) {
            console.error('Failed to delete item:', error)
        } finally {
            handleContextClose()
        }
    }

    const handleMethodChange = async (newMethod) => {
        if (!contextItem || contextItem.type !== 'endpoint') return

        try {
            // Update backend
            await endpointsAPI.update(contextItem.id, { method: newMethod })

            // Update local state
            setProjects(projects.map(p => {
                if (p.id === contextItem.projectId) {
                    return {
                        ...p,
                        endpoints: p.endpoints.map(e =>
                            e.id === contextItem.id ? { ...e, method: newMethod } : e
                        )
                    }
                }
                return p
            }))
        } catch (error) {
            console.error('Failed to update method:', error)
        } finally {
            handleContextClose()
        }
    }

    return (
        <>
            <Drawer
                variant="persistent"
                open={open}
                sx={{
                    width: open ? DRAWER_WIDTH : 0,
                    flexShrink: 0,
                    transition: 'width 0.3s ease',
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'background.paper',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        mt: 8,
                        height: 'calc(100vh - 64px)',
                        transition: 'transform 0.3s ease',
                    },
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header with Add Button */}
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Workspace
                        </Typography>
                        <Tooltip title="Add Project">
                            <IconButton size="small" onClick={handleAddProject} sx={{ color: 'primary.main' }}>
                                <AddIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Project List - Scrollable */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                        <List sx={{ pt: 1 }}>
                            {projects.map((project) => (
                                <Box key={project.id}>
                                    {/* Workspace Item */}
                                    <ListItemButton
                                        selected={selectedProject === project.id}
                                        onClick={() => handleProjectClick(project.id)}
                                        onContextMenu={(e) => handleContextMenu(e, { type: 'project', id: project.id, name: project.name })}
                                        sx={{
                                            '&.Mui-selected': {
                                                bgcolor: 'action.selected',
                                                '&:hover': {
                                                    bgcolor: 'action.selected',
                                                },
                                            },
                                        }}
                                    >
                                        {editingItem?.type === 'project' && editingItem.id === project.id ? (
                                            <InputBase
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                onKeyDown={handleEditKeyDown}
                                                onBlur={handleEditSave}
                                                autoFocus
                                                fullWidth
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{
                                                    typography: 'body1',
                                                    '& .MuiInputBase-input': {
                                                        p: 0,
                                                        fontWeight: 600
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <ListItemText
                                                primary={project.name}
                                                primaryTypographyProps={{
                                                    fontWeight: selectedProject === project.id ? 600 : 400,
                                                }}
                                            />
                                        )}
                                        {openProjects.includes(project.id) ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>

                                    {/* Workspace Features (Configuration, Collections, Review) */}
                                    <Collapse in={openProjects.includes(project.id)} timeout="auto">
                                        <List component="div" disablePadding>
                                            <ListItemButton
                                                sx={{ pl: 4 }}
                                                onClick={() => {
                                                    navigate(`/projects/${project.id}/config`)
                                                }}
                                            >
                                                <ListItemText
                                                    primary="Configuration"
                                                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                                                />
                                            </ListItemButton>
                                            <ListItemButton
                                                sx={{ pl: 4 }}
                                                onClick={() => {
                                                    navigate(`/projects/${project.id}/collections`)
                                                }}
                                            >
                                                <ListItemText
                                                    primary="Collections"
                                                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                                                />
                                            </ListItemButton>
                                            <ListItemButton
                                                sx={{ pl: 4 }}
                                                onClick={() => {
                                                    navigate(`/projects/${project.id}/review`)
                                                }}
                                            >
                                                <ListItemText
                                                    primary="Review Test Cases"
                                                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                                                />
                                            </ListItemButton>
                                        </List>
                                    </Collapse>
                                </Box>
                            ))}
                        </List>
                    </Box>

                    {/* Settings at bottom - Fixed */}
                    <Box
                        sx={{
                            p: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            '&:hover': {
                                bgcolor: 'action.hover',
                            }
                        }}
                        onClick={handleSettingsClick}
                    >
                        <SettingsIcon sx={{ color: 'text.primary' }} />
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            Settings
                        </Typography>
                    </Box>
                </Box>
            </Drawer>

            {/* Context Menu for Projects and Endpoints */}
            <Menu
                open={contextMenu !== null}
                onClose={handleContextClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                {/* Removed workspace-specific context menu items - now in hierarchical nav */}
                <MenuItem onClick={handleRename}>
                    <ListItemText>Rename</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    )
}

export default WorkspaceSidebar
