import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Stack,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import TestCaseReviewCard from '../components/TestCaseReviewCard';

/**
 * TestCaseReviewDemo Component
 * 
 * Demonstrates the TestCaseReviewCard component with dummy data
 * Navigate to: /demo/test-case-review
 */
const TestCaseReviewDemo = () => {
    const [testCases, setTestCases] = useState([
        // Functional Test Cases
        {
            id: 'tc-001',
            title: 'Create user with valid data',
            description: 'Verify that a new user can be created successfully with all required fields',
            category: 'FUNCTIONAL',
            status: 'DRAFT',
            expected_status: 201,
            endpoint: {
                id: 'ep-001',
                name: 'POST /api/users',
                method: 'POST',
                url: '/api/users'
            },
            payload: {
                method: 'POST',
                url: '/api/users',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    age: 30,
                    role: 'user'
                }
            },
            reviewer_info: null
        },
        {
            id: 'tc-002',
            title: 'Get user by ID',
            description: 'Retrieve an existing user by their unique ID',
            category: 'FUNCTIONAL',
            status: 'APPROVED',
            expected_status: 200,
            endpoint: {
                id: 'ep-002',
                name: 'GET /api/users/:id',
                method: 'GET',
                url: '/api/users/:id'
            },
            payload: {
                method: 'GET',
                url: '/api/users/123',
                headers: {
                    'Authorization': 'Bearer {{token}}'
                }
            },
            reviewer_info: {
                reviewer_name: 'Alice Smith',
                reviewed_at: '2026-01-20T10:30:00Z'
            }
        },

        // Validation Test Cases
        {
            id: 'tc-003',
            title: 'Validation - Missing required email field',
            description: 'Verify proper error handling when email field is missing',
            category: 'VALIDATION',
            status: 'DRAFT',
            expected_status: 400,
            endpoint: {
                id: 'ep-001',
                name: 'POST /api/users',
                method: 'POST',
                url: '/api/users'
            },
            payload: {
                method: 'POST',
                url: '/api/users',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    name: 'Jane Doe',
                    age: 25
                    // email is intentionally missing
                }
            },
            reviewer_info: null
        },
        {
            id: 'tc-004',
            title: 'Validation - Invalid email format',
            description: 'Test that invalid email formats are rejected',
            category: 'VALIDATION',
            status: 'APPROVED',
            expected_status: 400,
            endpoint: {
                id: 'ep-001',
                name: 'POST /api/users',
                method: 'POST',
                url: '/api/users'
            },
            payload: {
                method: 'POST',
                url: '/api/users',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    name: 'Bob Wilson',
                    email: 'invalid-email-format',
                    age: 28
                }
            },
            reviewer_info: {
                reviewer_name: 'Bob Johnson',
                reviewed_at: '2026-01-20T14:15:00Z'
            }
        },

        // Security Test Cases
        {
            id: 'tc-005',
            title: 'Security - Unauthorized access without token',
            description: 'Verify that protected endpoints reject requests without authentication',
            category: 'SECURITY',
            status: 'DRAFT',
            expected_status: 401,
            endpoint: {
                id: 'ep-003',
                name: 'DELETE /api/users/:id',
                method: 'DELETE',
                url: '/api/users/:id'
            },
            payload: {
                method: 'DELETE',
                url: '/api/users/123',
                headers: {
                    // No Authorization header
                }
            },
            reviewer_info: null
        },
        {
            id: 'tc-006',
            title: 'Security - SQL injection attempt',
            description: 'Ensure SQL injection payloads are properly sanitized',
            category: 'SECURITY',
            status: 'REJECTED',
            expected_status: 400,
            endpoint: {
                id: 'ep-002',
                name: 'GET /api/users/:id',
                method: 'GET',
                url: '/api/users/:id'
            },
            payload: {
                method: 'GET',
                url: "/api/users/1' OR '1'='1",
                headers: {
                    'Authorization': 'Bearer {{token}}'
                }
            },
            reviewer_info: {
                reviewer_name: 'Charlie Davis',
                reviewed_at: '2026-01-20T16:45:00Z',
                rejection_reason: 'This test case does not properly validate the sanitization mechanism. Need to check response body for SQL errors.'
            }
        },

        // UX/Error Test Cases
        {
            id: 'tc-007',
            title: 'UX - Resource not found (404)',
            description: 'Verify proper 404 error message when user does not exist',
            category: 'UX_ERROR',
            status: 'APPROVED',
            expected_status: 404,
            endpoint: {
                id: 'ep-002',
                name: 'GET /api/users/:id',
                method: 'GET',
                url: '/api/users/:id'
            },
            payload: {
                method: 'GET',
                url: '/api/users/99999',
                headers: {
                    'Authorization': 'Bearer {{token}}'
                }
            },
            reviewer_info: {
                reviewer_name: 'Alice Smith',
                reviewed_at: '2026-01-21T09:00:00Z'
            }
        },
        {
            id: 'tc-008',
            title: 'UX - Rate limit exceeded',
            description: 'Test that rate limiting returns appropriate error message',
            category: 'UX_ERROR',
            status: 'DRAFT',
            expected_status: 429,
            endpoint: {
                id: 'ep-001',
                name: 'POST /api/users',
                method: 'POST',
                url: '/api/users'
            },
            payload: {
                method: 'POST',
                url: '/api/users',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Simulate-Rate-Limit': 'true'
                },
                body: {
                    name: 'Test User',
                    email: 'test@example.com',
                    age: 25
                }
            },
            reviewer_info: null
        },

        // More endpoint - Update user
        {
            id: 'tc-009',
            title: 'Update user profile',
            description: 'Successfully update user information',
            category: 'FUNCTIONAL',
            status: 'DRAFT',
            expected_status: 200,
            endpoint: {
                id: 'ep-004',
                name: 'PUT /api/users/:id',
                method: 'PUT',
                url: '/api/users/:id'
            },
            payload: {
                method: 'PUT',
                url: '/api/users/123',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer {{token}}'
                },
                body: {
                    name: 'John Updated',
                    email: 'john.updated@example.com',
                    age: 31
                }
            },
            reviewer_info: null
        },
        {
            id: 'tc-010',
            title: 'Validation - Negative age value',
            description: 'Reject user creation with negative age',
            category: 'VALIDATION',
            status: 'DRAFT',
            expected_status: 400,
            endpoint: {
                id: 'ep-001',
                name: 'POST /api/users',
                method: 'POST',
                url: '/api/users'
            },
            payload: {
                method: 'POST',
                url: '/api/users',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    name: 'Invalid User',
                    email: 'invalid@example.com',
                    age: -5
                }
            },
            reviewer_info: null
        }
    ]);

    const handleApprove = (testCaseId) => {
        setTestCases(prevCases =>
            prevCases.map(tc =>
                tc.id === testCaseId
                    ? {
                        ...tc,
                        status: 'APPROVED',
                        reviewer_info: {
                            reviewer_name: 'Demo User',
                            reviewed_at: new Date().toISOString()
                        }
                    }
                    : tc
            )
        );
    };

    const handleReject = (testCaseId, reason) => {
        setTestCases(prevCases =>
            prevCases.map(tc =>
                tc.id === testCaseId
                    ? {
                        ...tc,
                        status: 'REJECTED',
                        reviewer_info: {
                            reviewer_name: 'Demo User',
                            reviewed_at: new Date().toISOString(),
                            rejection_reason: reason
                        }
                    }
                    : tc
            )
        );
    };

    // Group test cases by endpoint
    const groupedTestCases = testCases.reduce((acc, testCase) => {
        const endpointKey = testCase.endpoint.id;
        if (!acc[endpointKey]) {
            acc[endpointKey] = {
                endpoint: testCase.endpoint,
                testCases: []
            };
        }
        acc[endpointKey].testCases.push(testCase);
        return acc;
    }, {});

    // Count by status
    const statusCounts = testCases.reduce((acc, tc) => {
        acc[tc.status] = (acc[tc.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Test Case Review Demo
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Interactive demo of the TestCaseReviewCard component with sample data
                </Typography>

                {/* Status Summary */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Chip
                        label={`${statusCounts.DRAFT || 0} Draft`}
                        color="default"
                        variant="outlined"
                    />
                    <Chip
                        label={`${statusCounts.APPROVED || 0} Approved`}
                        color="success"
                    />
                    <Chip
                        label={`${statusCounts.REJECTED || 0} Rejected`}
                        color="error"
                    />
                    <Chip
                        label={`${testCases.length} Total`}
                        color="info"
                        variant="outlined"
                    />
                </Stack>
            </Box>

            {/* Grouped Test Cases */}
            <Stack spacing={2}>
                {Object.values(groupedTestCases).map((group, groupIdx) => (
                    <Accordion key={group.endpoint.id} defaultExpanded={groupIdx === 0}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <Chip
                                    label={group.endpoint.method}
                                    size="small"
                                    color={
                                        group.endpoint.method === 'GET' ? 'success' :
                                            group.endpoint.method === 'POST' ? 'primary' :
                                                group.endpoint.method === 'PUT' ? 'warning' :
                                                    group.endpoint.method === 'DELETE' ? 'error' : 'default'
                                    }
                                    sx={{ minWidth: 60 }}
                                />
                                <Typography variant="subtitle1" sx={{ flex: 1 }}>
                                    {group.endpoint.name}
                                </Typography>
                                <Chip
                                    label={`${group.testCases.length} test${group.testCases.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                {group.testCases.map(testCase => (
                                    <TestCaseReviewCard
                                        key={testCase.id}
                                        testCase={testCase}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                    />
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Container>
    );
};

export default TestCaseReviewDemo;
