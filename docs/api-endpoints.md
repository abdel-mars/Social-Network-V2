# API Endpoints

This document outlines all backend endpoints, their purpose, expected payloads, and responses.

## Base URL
`/api/v1`

---

## 1. Posts

Handles creation, retrieval, and management of posts.

### `GET /posts`
- **Description**: Retrieves the main feed of posts for the authenticated user.
- **Auth**: Required (session cookie).
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "post123",
      "authorId": "user456",
      "authorName": "John Doe",
      "content": "This is my first post!",
      "createdAt": "2023-11-01T10:00:00Z",
      "commentsCount": 5
    }
  ]
  ```

### `POST /posts`
- **Description**: Creates a new post.
- **Auth**: Required (session cookie).
- **Payload**:
  ```json
  {
    "content": "Hello world, this is a new post!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "post124",
    "authorId": "currentUser",
    "content": "Hello world, this is a new post!",
    "createdAt": "2023-11-01T11:00:00Z"
  }
  ```

---

## 2. Comments

*(To be defined)*

---

## 3. Followers

*(To be defined)*