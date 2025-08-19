# Testing Guide

This guide provides information on how to test the API endpoints of the project.

## Authentication

### POST /api/auth/login

Login a user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/logout

Logout a user.

**Request Body:**

```json
{
  "refreshToken": "your-refresh-token"
}
```

### POST /api/auth/refresh

Refresh the access token.

**Request Body:**

```json
{
  "refreshToken": "your-refresh-token"
}
```

## Users

### POST /api/users

Create a new user (superadmin only).

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "role": "customer",
  "password": "newpassword"
}
```

### PATCH /api/users/:id

Update a user.

**Request Body:**

```json
{
  "name": "Updated Name",
  "number": "1234567890",
  "addressLane1": "123 Main St",
  "addressLane2": "Apt 4B",
  "city": "Anytown",
  "state": "CA",
  "zipCode": "12345"
}
```

## Problems

### POST /api/problems

Create a new problem (employee only).

**Request Body:**

```json
{
  "title": "Trash not collected",
  "additionalNotes": "The trash has been sitting there for 3 days.",
  "location": {
    "type": "Point",
    "coordinates": [-73.935242, 40.73061]
  },
  "imageUrl": "http://example.com/image.jpg",
  "customerId": "C1"
}
```

### GET /api/problems

Get all problems (admin or superadmin only).

### GET /api/problems/:id

Get a problem by ID.

### GET /api/problems/my-problems

Get problems for the logged-in customer.

### PATCH /api/problems/:id/status

Update the status of a problem (admin or superadmin only).

**Request Body:**

```json
{
  "status": "forwarded"
}
```

## Messages

### POST /api/messages

Create a new message.

**Request Body:**

```json
{
  "chatType": "problem",
  "problemId": "problem-id",
  "message": "Hello, I have a question about this problem."
}
```

### GET /api/messages/:id

Get messages for a problem or support chat.

**Query Parameters:**

-   `chatType`: `problem` or `support`

### PATCH /api/messages/:messageId/read

Mark a message as read.

## Notifications

### GET /api/notifications

Get all notifications for the logged-in user.

### PATCH /api/notifications/:id/read

Mark a notification as read.

## Support

### POST /api/support

Create a new support ticket.

**Request Body:**

```json
{
  "title": "Having trouble with the app",
  "details": "I can't seem to log in."
}
```

### GET /api/support

Get all support tickets (admin or superadmin only).

### GET /api/support/:id

Get a support ticket by ID (admin or superadmin only).

## Upload

### POST /api/upload

Upload a file.

**Request Body:**

-   `image`: The image file to upload.