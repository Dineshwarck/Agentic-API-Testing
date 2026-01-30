import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
}

const projectsSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        fetchProjectsStart: (state) => {
            state.loading = true
            state.error = null
        },
        fetchProjectsSuccess: (state, action) => {
            state.loading = false
            state.projects = action.payload
        },
        fetchProjectsFailure: (state, action) => {
            state.loading = false
            state.error = action.payload
        },
        setCurrentProject: (state, action) => {
            state.currentProject = action.payload
        },
    },
})

export const {
    fetchProjectsStart,
    fetchProjectsSuccess,
    fetchProjectsFailure,
    setCurrentProject,
} = projectsSlice.actions

export default projectsSlice.reducer
