# Client Requirements for User Management System

## Business Rules

1. **User Creation**:
    - All users must have a valid name and job title.
    - The system should acknowledge creation immediately.
    - **Constraint**: If the job is "Leader", the system should double-check the response time (must be under 500ms).

2. **Data Privacy**:
    - When listing users, ensure no sensitive PII is exposed (only First Name, Last Name, and Avatar).

3. **Error Handling**:
    - Getting a non-existent user must return a 404.
    - Deleting a user must be permanent and return 204.

4. **Performance**:
    - Pagination is required for listing users. Default page size is 6.
