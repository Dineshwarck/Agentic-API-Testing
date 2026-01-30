import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import store from './store/store'

// Moderor AI Theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#FF5722', // Orange - primary action color
            light: '#FF7043',
            dark: '#E64A19',
            contrastText: '#fff',
        },
        secondary: {
            main: '#455A64', // Blue Gray
            light: '#607D8B',
            dark: '#37474F',
        },
        background: {
            default: '#F5F5F5', // Light gray background
            paper: '#FFFFFF',
        },
        error: {
            main: '#D32F2F', // RED - High severity
        },
        warning: {
            main: '#FFA726', // YELLOW - Medium severity
        },
        success: {
            main: '#66BB6A', // GREEN - Low severity/Success
        },
        info: {
            main: '#42A5F5', // BLUE - Info
        },
        text: {
            primary: '#212121',
            secondary: '#757575',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2rem',
            fontWeight: 600,
        },
        h2: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: 600,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
        },
        button: {
            textTransform: 'none', // Don't uppercase buttons
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderRadius: 8,
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    padding: '8px 16px',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 2px 8px rgba(255,87,34,0.3)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    fontSize: '0.75rem',
                },
            },
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <App />
                </ThemeProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
)
