import {
  Box,
  TextField,
  Select,
  MenuItem,
  Paper,
  Grid,
  Stack,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  CircularProgress,
  Typography,
  Container
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { endpointsAPI, documentsAPI, agentAPI } from '../api/endpoints'
import FileUploader from '../components/FileUploader'
import AppButton from '../components/AppButton'

function TestingWorkbenchPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Load endpoint data
  const [loading, setLoading] = useState(true)
  const [endpoint, setEndpoint] = useState(null)

  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return
        const epResponse = await endpointsAPI.get(id)
        setEndpoint(epResponse.data)
        setMethod(epResponse.data.method || 'GET')
        setUrl(epResponse.data.url || '')
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Save changes
  const handleUpdate = async (updates) => {
    try {
      await endpointsAPI.update(id, updates)
      setEndpoint(prev => ({ ...prev, ...updates }))
    } catch (error) {
      console.error('Failed to update endpoint:', error)
    }
  }

  const handleMethodChange = (e) => {
    const newMethod = e.target.value
    setMethod(newMethod)
    handleUpdate({ method: newMethod })
  }

  const handleUrlChange = (e) => {
    setUrl(e.target.value)
  }

  const handleUrlBlur = () => {
    if (endpoint && url !== endpoint.url) {
      handleUpdate({ url: url })
    }
  }

  // Document Handlers
  const [devDoc, setDevDoc] = useState(null)
  const [clientReq, setClientReq] = useState(null)
  const [clientReqText, setClientReqText] = useState('')


  const handleDevDocUpload = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0]
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('doc_type', 'DEV_DOCS')
        if (endpoint) formData.append('project_id', endpoint.project_id || endpoint.project)
        if (id) formData.append('endpoint_id', id)

        const response = await documentsAPI.upload(formData)
        setDevDoc(response.data)
      } catch (error) {
        console.error('Failed to upload Dev Doc:', error)
      }
    }
  }

  const handleClientReqUpload = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0]
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('doc_type', 'REQUIREMENTS')
        if (endpoint) formData.append('project_id', endpoint.project_id || endpoint.project)
        if (id) formData.append('endpoint_id', id)

        const response = await documentsAPI.upload(formData)
        setClientReq(response.data)
        setClientReqText('')
      } catch (error) {
        console.error('Failed to upload Requirements:', error)
      }
    }
  }

  // --- Agent Generation ---

  const handleGenerateSpecs = async () => {
    if (!endpoint) return
    setGenerating(true)
    try {
      const projectId = endpoint.project_id || endpoint.project
      console.log('Calling generateSpecs with:', { projectId, apiKey: apiKey ? '***' : 'none', clientReqText })
      const response = await agentAPI.generateSpecs(projectId, apiKey, clientReqText)
      console.log('generateSpecs response:', response)
      console.log('Generated test cases:', response.data)

      // Only navigate if we got a successful response
      if (response && response.data) {
        console.log(`Successfully generated ${response.data.length} test cases, navigating to plan page`)
        navigate(`/testing-workbench/${id}/plan`)
      } else {
        console.error('No test cases returned from API')
        alert('No test cases were generated. Please check your documents and requirements.')
      }
    } catch (error) {
      console.error("Failed to generate specs", error)
      console.error("Error details:", error.response?.data || error.message)
      alert(`Failed to generate test plan: ${error.response?.data?.detail || error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
  if (!endpoint) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">Endpoint not found or failed to load. Please try again.</Typography></Box>

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>

        {/* Top Bar: Method & URL */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={method}
                onChange={handleMethodChange}
                sx={{ fontWeight: 'bold' }}
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              value={url}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              placeholder="https://api-endpoint/params"
            />
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {/* Context Documents Row - Side by Side, Equal Height */}
          <Box>
            <Grid container spacing={2} alignItems="stretch">
              <Grid item xs={12} md={6}>
                <FileUploader
                  title="Developer Documentation"
                  file={devDoc}
                  onUpload={handleDevDocUpload}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FileUploader
                  title="Client Requirements"
                  file={clientReq}
                  onUpload={handleClientReqUpload}
                  showTextInput
                  textValue={clientReqText}
                  onTextChange={(e) => setClientReqText(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Configuration Row */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Configuration</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  type={showApiKey ? 'text' : 'password'}
                  label="Auth Key (Optional)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end" size="small">
                          {showApiKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Generate Button Row */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <AppButton
              currentTheme="primary"
              size="large"
              startIcon={generating ? <CircularProgress size={24} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 28 }} />}
              onClick={handleGenerateSpecs}
              disabled={generating}
              sx={{ py: 2, px: 4, borderRadius: 2, fontSize: '1.2rem', width: '100%', maxWidth: '600px', border: '1px solid', borderColor: 'divider', bgcolor: 'primary.50' }}
            >
              {generating ? "Analyzing Docs..." : "Generate Test Plan (AI)"}
            </AppButton>
          </Box>

        </Stack>
      </Container>
    </Box>
  )
}

export default TestingWorkbenchPage
