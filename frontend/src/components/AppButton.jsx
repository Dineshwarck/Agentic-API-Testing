import { Button } from '@mui/material'

export default function AppButton({ children, sx, currentTheme, ...props }) {
    return (
        <Button
            variant="contained"
            color="primary" // Matches the Orange theme seen in Upload buttons
            sx={{
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 2,
                ...sx
            }}
            {...props}
        >
            {children}
        </Button>
    )
}
