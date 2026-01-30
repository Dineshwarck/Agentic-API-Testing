import React, { useState, useRef, useEffect } from 'react';
import {
    Drawer,
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    IconButton,
    Paper,
    Chip,
    CircularProgress,
    Divider,
    Card,
    CardContent,
    Collapse,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as SmartToyIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

/**
 * MessageBubble Component
 * 
 * Displays a single chat message from user or AI
 */
const MessageBubble = ({ message, onPreview, onApprove, onReject }) => {
    const [expanded, setExpanded] = useState(false);
    const isUser = message.role === 'user';

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                mb: 2,
            }}
        >
            <Box sx={{ maxWidth: '80%' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    {!isUser && <SmartToyIcon fontSize="small" color="primary" />}
                    <Typography variant="caption" color="text.secondary">
                        {isUser ? 'You' : 'AI Assistant'}
                    </Typography>
                    {isUser && <PersonIcon fontSize="small" color="action" />}
                </Stack>

                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        bgcolor: isUser ? 'primary.main' : 'background.paper',
                        color: isUser ? 'primary.contrastText' : 'text.primary',
                    }}
                >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                    </Typography>

                    {/* Preview Tests */}
                    {message.tests && message.tests.length > 0 && (
                        <Box mt={2}>
                            <Button
                                size="small"
                                variant="outlined"
                                endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                onClick={() => setExpanded(!expanded)}
                                sx={{ mb: 1 }}
                            >
                                {expanded ? 'Hide' : 'Preview'} {message.tests.length} Test Cases
                            </Button>

                            <Collapse in={expanded}>
                                <Stack spacing={1} mt={1}>
                                    {message.tests.map((test, idx) => (
                                        <Card key={idx} variant="outlined">
                                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                                    <Chip
                                                        label={test.category}
                                                        size="small"
                                                        color={
                                                            test.category === 'FUNCTIONAL' ? 'primary' :
                                                                test.category === 'VALIDATION' ? 'warning' :
                                                                    test.category === 'SECURITY' ? 'error' : 'info'
                                                        }
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        Status: {test.expected_status}
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {test.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {test.description}
                                                </Typography>
                                                {test.assertions && test.assertions.length > 0 && (
                                                    <Typography variant="caption" display="block" mt={0.5}>
                                                        {test.assertions.length} assertion(s)
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>

                                <Stack direction="row" spacing={1} mt={2}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => onApprove(message.tests)}
                                    >
                                        Approve & Add to Review
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={onReject}
                                    >
                                        Reject
                                    </Button>
                                </Stack>
                            </Collapse>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};

/**
 * AiTestGeneratorDrawer Component
 * 
 * Chat-based AI assistant for generating test cases
 * User can have a conversation with AI, preview generated tests, and approve/reject
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onTestsGenerated: (tests) => void
 * - endpoints: Array of endpoint objects
 * - existingTests: Array of existing test cases
 */
const AiTestGeneratorDrawer = ({
    open,
    onClose,
    onTestsGenerated,
    endpoints = [],
    existingTests = [],
}) => {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            content: 'Hi! I can help you generate test cases for your API endpoints. What would you like to test?\n\nFor example, you can ask me to:\n• "Generate security tests for POST /api/users"\n• "Create validation tests for missing required fields"\n• "Add edge case tests for the login endpoint"',
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isGenerating) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // Simulate AI processing
        setIsGenerating(true);

        // Mock AI response (replace with actual API call)
        setTimeout(() => {
            const mockTests = generateMockTests(userMessage, endpoints);

            const aiResponse = {
                role: 'ai',
                content: `I've generated ${mockTests.length} test cases based on your request. Please review them below and click "Approve & Add to Review" if they look good, or "Reject" to refine your request.`,
                tests: mockTests,
            };

            setMessages(prev => [...prev, aiResponse]);
            setIsGenerating(false);
        }, 2000);
    };

    const handleApprove = (tests) => {
        onTestsGenerated(tests);
        setMessages(prev => [
            ...prev,
            {
                role: 'ai',
                content: `Great! I've added ${tests.length} test cases to your review list. Is there anything else you'd like me to generate?`,
            },
        ]);
    };

    const handleReject = () => {
        setMessages(prev => [
            ...prev,
            {
                role: 'ai',
                content: 'No problem! Please let me know how you\'d like me to adjust the test cases, or ask for something different.',
            },
        ]);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 1, // Above AppBar (1301)
                '& .MuiDrawer-paper': {
                    width: 650,
                    maxWidth: '90vw',
                },
            }}
        >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <SmartToyIcon />
                            <Typography variant="h6">AI Test Generator</Typography>
                        </Stack>
                        <IconButton onClick={onClose} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Chat with AI to generate test cases
                    </Typography>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
                    {messages.map((message, idx) => (
                        <MessageBubble
                            key={idx}
                            message={message}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}

                    {isGenerating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">
                                AI is generating test cases...
                            </Typography>
                        </Box>
                    )}

                    <div ref={messagesEndRef} />
                </Box>

                {/* Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Type your request..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isGenerating}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isGenerating}
                            sx={{ minWidth: 80 }}
                        >
                            <SendIcon />
                        </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Press Enter to send, Shift+Enter for new line
                    </Typography>
                </Box>
            </Box>
        </Drawer>
    );
};

/**
 * Mock function to generate test cases based on user prompt
 * Replace with actual API call to AI backend
 */
function generateMockTests(prompt, endpoints) {
    const endpoint = endpoints[0] || { id: 'ep-001', name: 'POST /api/users' };

    // Simple keyword detection
    const isSecurityTest = /security|auth|injection|xss/i.test(prompt);
    const isValidationTest = /validation|required|missing|invalid/i.test(prompt);
    const isFunctionalTest = /functional|happy|success/i.test(prompt);

    const tests = [];

    if (isSecurityTest || (!isValidationTest && !isFunctionalTest)) {
        tests.push({
            id: `tc-ai-${Date.now()}-1`,
            title: 'SQL Injection Test',
            description: 'Attempt SQL injection in user input fields',
            category: 'SECURITY',
            expected_status: 400,
            endpoint: endpoint.id,
            endpoint_name: endpoint.name,
            payload: {
                method: 'POST',
                url: endpoint.name.split(' ')[1] || '/api/users',
                headers: { 'Content-Type': 'application/json' },
                body: { name: "'; DROP TABLE users; --" },
            },
            assertions: [
                { type: 'status_code', operator: 'equals', value: '400' },
                { type: 'json_path', path: '$.error', operator: 'exists' },
            ],
        });
    }

    if (isValidationTest || (!isSecurityTest && !isFunctionalTest)) {
        tests.push({
            id: `tc-ai-${Date.now()}-2`,
            title: 'Missing Required Field Test',
            description: 'Test validation when required email field is missing',
            category: 'VALIDATION',
            expected_status: 400,
            endpoint: endpoint.id,
            endpoint_name: endpoint.name,
            payload: {
                method: 'POST',
                url: endpoint.name.split(' ')[1] || '/api/users',
                headers: { 'Content-Type': 'application/json' },
                body: { name: 'John Doe' },
            },
            assertions: [
                { type: 'status_code', operator: 'equals', value: '400' },
                { type: 'json_path', path: '$.errors.email', operator: 'exists' },
            ],
        });
    }

    if (isFunctionalTest || tests.length === 0) {
        tests.push({
            id: `tc-ai-${Date.now()}-3`,
            title: 'Create User - Valid Data',
            description: 'Successfully create a new user with valid data',
            category: 'FUNCTIONAL',
            expected_status: 201,
            endpoint: endpoint.id,
            endpoint_name: endpoint.name,
            payload: {
                method: 'POST',
                url: endpoint.name.split(' ')[1] || '/api/users',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    age: 30,
                },
            },
            assertions: [
                { type: 'status_code', operator: 'equals', value: '201' },
                { type: 'json_path', path: '$.data.id', operator: 'exists' },
                { type: 'json_path', path: '$.data.email', operator: 'equals', value: 'john.doe@example.com' },
            ],
        });
    }

    return tests;
}

export default AiTestGeneratorDrawer;
