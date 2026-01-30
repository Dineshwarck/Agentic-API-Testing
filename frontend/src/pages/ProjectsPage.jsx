import {
    Typography,
    Box,
    Button,
    Grid,
    Card,
    CardContent,
    Stack,
} from '@mui/material'
import {
    Add as AddIcon,
    Folder as FolderIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

function ProjectsPage() {
    const navigate = useNavigate()

    // Mock data - replace with Redux
    const projects = [
        { id: '1', name: 'Workspace 1', endpointsCount: 2, createdAt: 'Oct 24, 2025' },
        { id: '2', name: 'Workspace 2', endpointsCount: 0, createdAt: 'Oct 23, 2025' },
        { id: '3', name: 'Workspace 3', endpointsCount: 1, createdAt: 'Oct 22, 2025' },
        { id: '4', name: 'Workspace 4', endpointsCount: 0, createdAt: 'Oct 20, 2025' },
    ]

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h1" sx={{ mb: 0.5 }}>
                        Projects
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your API testing workspaces
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/projects/new')}
                >
                    New Project
                </Button>
            </Box>

            {/* Projects Grid */}
            <Grid container spacing={3}>
                {projects.map((project) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                }
                            }}
                            onClick={() => navigate(`/testing-workbench/${project.id}`)}
                        >
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            bgcolor: 'primary.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FolderIcon sx={{ color: 'white', fontSize: 28 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {project.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {project.endpointsCount} endpoint{project.endpointsCount !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Typography variant="caption" color="text.secondary">
                                    Created {project.createdAt}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    )
}

export default ProjectsPage
