# Roles and Permissions API Documentation

This document provides comprehensive API instructions for managing roles and permissions in the education platform backend.

## Table of Contents
- [Roles API](#roles-api)
- [Permissions API](#permissions-api)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

---

## Roles API

Base URL: `/roles`

### 1. Get All Roles

**Endpoint:** `GET /roles`

**Description:** Retrieves all roles with their associated permissions.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Response:**
```json
{
  "success": true,
  "message": "View Roles",
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "permissions": [
        {
          "id": 1,
          "action": "CREATE_USER",
          "module": "User",
          "description": "Create new users"
        },
        {
          "id": 2,
          "action": "DELETE_USER",
          "module": "User",
          "description": "Delete existing users"
        }
      ]
    },
    {
      "id": 2,
      "name": "Student",
      "permissions": [
        {
          "id": 3,
          "action": "VIEW_COURSES",
          "module": "Course",
          "description": "View available courses"
        }
      ]
    }
  ]
}
```

---

### 2. Get Single Role

**Endpoint:** `GET /roles/:id`

**Description:** Retrieves a specific role by ID with its associated permissions.

**Parameters:**
- `id` (number, required): Role ID

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Example Request:**
```
GET /roles/1
```

**Response:**
```json
{
  "success": true,
  "message": "View one Role",
  "data": {
    "id": 1,
    "name": "Admin",
    "permissions": [
      {
        "id": 1,
        "action": "CREATE_USER",
        "module": "User",
        "description": "Create new users"
      },
      {
        "id": 2,
        "action": "DELETE_USER",
        "module": "User",
        "description": "Delete existing users"
      }
    ]
  }
}
```

**Error Response (Role not found):**
```json
{
  "success": false,
  "message": "Role with ID 1 not found",
  "statusCode": 404
}
```

---

### 3. Create New Role

**Endpoint:** `POST /roles`

**Description:** Creates a new role with the specified name.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Request Body:**
```json
{
  "name": "Teacher"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Create new Role",
  "data": {
    "id": 3,
    "name": "Teacher",
    "permissions": []
  }
}
```

**Error Response (Role already exists):**
```json
{
  "success": false,
  "message": "Role already exists",
  "statusCode": 400
}
```

---

### 4. Delete Role

**Endpoint:** `DELETE /roles/:id`

**Description:** Deletes a role by ID.

**Parameters:**
- `id` (number, required): Role ID to delete

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Example Request:**
```
DELETE /roles/3
```

**Response:**
```json
{
  "success": true,
  "message": "Delete Role",
  "data": null
}
```

**Error Response (Role not found):**
```json
{
  "success": false,
  "message": "Role not found",
  "statusCode": 404
}
```

---

### 5. Update Role Permissions

**Endpoint:** `PUT /roles/permissions`

**Description:** Updates the permissions assigned to a specific role.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Request Body:**
```json
{
  "roleId": 2,
  "permissionIds": [1, 3, 5]
}
```

**Validation Rules:**
- `roleId`: Must be a valid integer
- `permissionIds`: Must be an array of integers, cannot be empty

**Response:**
```json
{
  "success": true,
  "message": "Update role permissions",
  "data": {
    "id": 2,
    "name": "Student",
    "permissions": [
      {
        "id": 1,
        "action": "CREATE_USER",
        "module": "User",
        "description": "Create new users"
      },
      {
        "id": 3,
        "action": "VIEW_COURSES",
        "module": "Course",
        "description": "View available courses"
      },
      {
        "id": 5,
        "action": "ENROLL_COURSE",
        "module": "Course",
        "description": "Enroll in courses"
      }
    ]
  }
}
```

**Error Responses:**

Role not found:
```json
{
  "success": false,
  "message": "Role not found",
  "statusCode": 404
}
```

Some permissions not found:
```json
{
  "success": false,
  "message": "Some permissions not found",
  "statusCode": 404
}
```

---

## Permissions API

Base URL: `/permission`

### 1. Get All Permissions

**Endpoint:** `GET /permission`

**Description:** Retrieves all available permissions in the system.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Response:**
```json
{
  "success": true,
  "message": "Get permissions",
  "data": [
    {
      "id": 1,
      "action": "CREATE_USER",
      "module": "User",
      "description": "Create new users"
    },
    {
      "id": 2,
      "action": "DELETE_USER",
      "module": "User",
      "description": "Delete existing users"
    },
    {
      "id": 3,
      "action": "VIEW_COURSES",
      "module": "Course",
      "description": "View available courses"
    },
    {
      "id": 4,
      "action": "CREATE_COURSE",
      "module": "Course",
      "description": "Create new courses"
    }
  ]
}
```

---

### 2. Get Single Permission

**Endpoint:** `GET /permission/:id`

**Description:** Retrieves a specific permission by ID.

**Parameters:**
- `id` (number, required): Permission ID

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Example Request:**
```
GET /permission/1
```

**Response:**
```json
{
  "success": true,
  "message": "Get permission",
  "data": {
    "id": 1,
    "action": "CREATE_USER",
    "module": "User",
    "description": "Create new users"
  }
}
```

**Error Response (Permission not found):**
```json
{
  "success": false,
  "message": "Permission with ID 1 not found",
  "statusCode": 404
}
```

---

### 3. Create New Permission

**Endpoint:** `POST /permission`

**Description:** Creates a new permission with specified action, module, and description.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Request Body:**
```json
{
  "action": "UPDATE_PROFILE",
  "module": "User",
  "description": "Update user profile information"
}
```

**Validation Rules:**
- `action`: Required string, must be unique
- `module`: Required string
- `description`: Required string

**Response:**
```json
{
  "success": true,
  "message": "Create permission",
  "data": {
    "id": 5,
    "action": "UPDATE_PROFILE",
    "module": "User",
    "description": "Update user profile information"
  }
}
```

**Error Response (Permission action already exists):**
```json
{
  "success": false,
  "message": "Permission action existed",
  "statusCode": 404
}
```

---

### 4. Delete Permission

**Endpoint:** `DELETE /permission/:id`

**Description:** Deletes a permission by ID.

**Parameters:**
- `id` (number, required): Permission ID to delete

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if authentication is required)
```

**Example Request:**
```
DELETE /permission/5
```

**Response:**
```json
{
  "success": true,
  "message": "Delete permission",
  "data": null
}
```

**Error Response (Permission not found):**
```json
{
  "success": false,
  "message": "Permission not found",
  "statusCode": 404
}
```

---

## Data Models

### Role Entity
```typescript
{
  id: number;           // Primary key, auto-generated
  name: string;         // Unique role name
  permissions: Permission[]; // Associated permissions
}
```

### Permission Entity
```typescript
{
  id: number;           // Primary key, auto-generated
  action: string;       // Unique action identifier (e.g., 'CREATE_USER')
  module: string;       // Module/feature the permission belongs to
  description: string;  // Human-readable description
}
```

### DTOs

#### UpdateRolePermissionsDto
```typescript
{
  roleId: number;        // Required integer
  permissionIds: number[]; // Required array of integers, cannot be empty
}
```

#### CreatePermissionDto
```typescript
{
  action: string;        // Required, unique action identifier
  module: string;        // Required module name
  description: string;   // Required description
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400|404|500
}
```

### Common HTTP Status Codes:
- **200**: Success
- **400**: Bad Request (validation errors, duplicate entries)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

### Common Error Scenarios:

1. **Role not found**: When trying to access/modify a non-existent role
2. **Permission not found**: When trying to access/modify a non-existent permission
3. **Duplicate role name**: When creating a role with an existing name
4. **Duplicate permission action**: When creating a permission with an existing action
5. **Invalid permission IDs**: When updating role permissions with non-existent permission IDs
6. **Validation errors**: When required fields are missing or have invalid formats

---

## Example Usage Scenarios

### Scenario 1: Setting up a new role with permissions

1. Create a new role:
```bash
POST /roles
{
  "name": "Content Creator"
}
```

2. Get available permissions:
```bash
GET /permission
```

3. Assign permissions to the role:
```bash
PUT /roles/permissions
{
  "roleId": 4,
  "permissionIds": [3, 4, 6]
}
```

### Scenario 2: Managing permissions

1. Create a new permission:
```bash
POST /permission
{
  "action": "MODERATE_COMMENTS",
  "module": "Comment",
  "description": "Moderate user comments"
}
```

2. View all permissions:
```bash
GET /permission
```

3. Delete unused permission:
```bash
DELETE /permission/7
```

---

## Authentication & Authorization

Note: The actual authentication requirements depend on your application's security configuration. Ensure that appropriate guards and decorators are applied to protect these endpoints based on your security requirements.

Common patterns:
- Admin-only access for role/permission management
- JWT token-based authentication
- Role-based access control for different operations
