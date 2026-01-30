import apiClient from './client'

// Authentication endpoints
export const authAPI = {
    register: (email, password) => apiClient.post('/auth/register', { email, password }),
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    logout: () => apiClient.post('/auth/logout'),
    getMe: () => apiClient.get('/auth/me'),
}

// Projects endpoints
export const projectsAPI = {
    list: () => apiClient.get('/projects'),
    create: (projectData) => apiClient.post('/projects', projectData),
    get: (id) => apiClient.get(`/projects/${id}`),
    update: (id, data) => apiClient.put(`/projects/${id}`, data),
    delete: (id) => apiClient.delete(`/projects/${id}`),
    // Endpoints for a specific project
    listEndpoints: (projectId) => apiClient.get(`/projects/${projectId}/endpoints`),
    createEndpoint: (projectId, endpointData) => apiClient.post(`/projects/${projectId}/endpoints`, endpointData),
}

export const endpointsAPI = {
    get: (id) => apiClient.get(`/endpoints/${id}`),
    update: (id, data) => apiClient.put(`/endpoints/${id}`, data),
    delete: (id) => apiClient.delete(`/endpoints/${id}`),
    delete: (id) => apiClient.delete(`/endpoints/${id}`),
}

export const environmentsAPI = {
    list: (projectId) => apiClient.get(`/projects/${projectId}/environments`),
    create: (projectId, data) => apiClient.post(`/projects/${projectId}/environments`, data),
    update: (id, data) => apiClient.put(`/environments/${id}`, data),
    delete: (id) => apiClient.delete(`/environments/${id}`),
}

export const documentsAPI = {
    upload: (formData) => apiClient.post('/documents', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
}

// Agentic Analysis
export const agentAPI = {
    generateSpecs: (projectId, apiKey = null, additionalContext = null, endpointIds = null) => {
        const config = {}
        if (apiKey) {
            config.headers = { 'X-API-Key': apiKey }
        }
        const payload = {
            ...(additionalContext && { additional_context: additionalContext }),
            ...(endpointIds && { endpoint_ids: endpointIds })
        }
        return apiClient.post(`/agent/generate-specs/${projectId}`, payload, config)
    },

    generateFromSwagger: (projectId, swaggerUrl, additionalContext = null) => {
        return apiClient.post('/agent/generate-from-swagger', {
            swagger_url: swaggerUrl,
            additional_context: additionalContext
        }, {
            params: { project_id: projectId } // Ensure prompt param if needed, though mostly body in router
        })
    },
    executeRequest: (config) => apiClient.post('/execute/request', config),
}

// Test Cases Management
export const testCasesAPI = {
    list: (projectId) => apiClient.get(`/projects/${projectId}/test-cases`),
    update: (id, data) => apiClient.put(`/test-cases/${id}`, data),
    delete: (id) => apiClient.delete(`/test-cases/${id}`),
    refine: (id, comment) => apiClient.post(`/test-cases/${id}/refine`, null, { params: { comment } }),
    // approve: (id) => apiClient.post(`/test-cases/${id}/approve`), // Use update status for now
}

// Test Execution
export const testRunsAPI = {
    execute: (projectId, testCaseIds = null, testDataId = null) => {
        const payload = {}
        if (testCaseIds) payload.test_case_ids = testCaseIds
        if (testDataId) payload.test_data_id = testDataId
        return apiClient.post(`/projects/${projectId}/runs`, payload)
    },
    getDetails: (runId) => apiClient.get(`/runs/${runId}`),
    getResults: (runId) => apiClient.get(`/runs/${runId}/results`),
    downloadReport: (runId) => apiClient.get(`/runs/${runId}/report`, { responseType: 'blob' }),
}

export const fileAPI = {
    listTestData: (projectId) => apiClient.get(`/projects/${projectId}/test-data`),
    uploadTestData: (projectId, file) => {
        const formData = new FormData()
        formData.append('file', file)
        return apiClient.post(`/projects/${projectId}/test-data`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },
    deleteTestData: (fileId) => apiClient.delete(`/test-data/${fileId}`),
    previewTestData: (fileId) => apiClient.get(`/test-data/${fileId}/preview`),
}

