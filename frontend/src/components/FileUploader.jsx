import { Box, Paper, Typography, Button, TextField } from '@mui/material'
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material'

export default function FileUploader({
    title,
    file,
    onUpload,
    accept = ".pdf,.md,.doc,.docx,.txt",
    textValue,
    onTextChange,
    textPlaceholder = "Type requirements here...",
    showTextInput = false
}) {
    return (
        <Paper sx={{ p: 2.5, height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                {title}
            </Typography>

            {file ? (
                <Box
                    sx={{
                        flexGrow: 1,
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'success.50',
                        p: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                        ✓ {file.name}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: 'background.default',
                            transition: 'all 0.2s',
                            flex: '1 1 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover',
                            },
                        }}
                        component="label"
                    >
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Box
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                px: 2,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                boxShadow: 1
                            }}
                        >
                            Upload File
                        </Box>
                        <input
                            type="file"
                            hidden
                            accept={accept}
                            onChange={onUpload}
                        />
                    </Box>

                    {showTextInput && (
                        <>
                            <Typography align="center" variant="caption" sx={{ color: 'text.secondary' }}>
                                — OR —
                            </Typography>

                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                placeholder={textPlaceholder}
                                value={textValue}
                                onChange={onTextChange}
                                sx={{
                                    bgcolor: 'background.paper',
                                    '& .MuiInputBase-root': { alignItems: 'flex-start' }
                                }}
                            />
                        </>
                    )}
                </Box>
            )}
        </Paper>
    )
}
