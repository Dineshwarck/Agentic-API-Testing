import { Box, AppBar, Toolbar, IconButton, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { Menu as MenuIcon, Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material'
import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import WorkspaceSidebar from './WorkspaceSidebar'

function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [profileAnchor, setProfileAnchor] = useState(null)

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen)
    }

    const handleProfileClick = (event) => {
        setProfileAnchor(event.currentTarget)
    }

    const handleProfileClose = () => {
        setProfileAnchor(null)
    }

    const handleProfile = () => {
        handleProfileClose()
        console.log('Open profile')
    }

    const handleLogout = () => {
        handleProfileClose()
        console.log('Logout')
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Top AppBar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    zIndex: (theme) => theme.zIndex.drawer + 1 // Below modal drawers
                }}
            >
                <Toolbar>
                    {/* Menu Toggle */}
                    <IconButton
                        edge="start"
                        onClick={toggleSidebar}
                        sx={{ mr: 2, color: 'text.primary' }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Logo */}
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <img
                            src="/upload/logo/moderor-logo.png"
                            alt="Moderor AI"
                            style={{ height: '32px', width: 'auto' }}
                        />
                    </Box>

                    {/* User Avatar with Menu */}
                    <IconButton onClick={handleProfileClick}>
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'primary.main',
                                fontSize: '0.875rem'
                            }}
                        >
                            U
                        </Avatar>
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Left Sidebar */}
            <WorkspaceSidebar open={sidebarOpen} />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    mt: 8, // Push below AppBar
                    transition: 'margin 0.3s ease',
                    overflowX: 'hidden',
                    minWidth: 0, // Prevent flex child from overflowing
                }}
            >
                <Outlet />
            </Box>

            {/* Profile Menu */}
            <Menu
                anchorEl={profileAnchor}
                open={Boolean(profileAnchor)}
                onClose={handleProfileClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    )
}

export default Layout
