# ReqRes API Specification

Base URL: https://reqres.in/api

## Overview
ReqRes is a hosted REST-API ready to respond to your AJAX requests.

## Endpoints

### 1. List Users
- **Method**: GET
- **URL**: /users
- **Query Parameters**:
    - `page` (integer): The page number to fetch.
- **Response**: 200 OK
    - Returns a list of users with pagination details.

### 2. Single User
- **Method**: GET
- **URL**: /users/{id}
- **Response**: 200 OK
    - Returns a single user object.
- **Response**: 404 Not Found
    - If user not found.

### 3. Create User
- **Method**: POST
- **URL**: /users
- **Body**:
    - `name` (string): Name of the user.
    - `job` (string): Job title.
- **Response**: 201 Created
    - Returns the created user with an ID and createdAt timestamp.

### 4. Update User
- **Method**: PUT
- **URL**: /users/{id}
- **Body**:
    - `name` (string)
    - `job` (string)
- **Response**: 200 OK
    - Returns updated user info.

### 5. Delete User
- **Method**: DELETE
- **URL**: /users/{id}
- **Response**: 204 No Content
