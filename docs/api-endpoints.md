# API Endpoints

This document outlines all backend endpoints, their purpose, expected payloads, and responses.

## Base URL
`/api`

The backend mounts its whole API under a single `/api` prefix
(`backend/internal/servergo/runserver.go`), so `GET /posts` below is actually
served at `GET /api/posts`. There is no version segment. Static uploads live
outside that prefix, at `/uploads/`.

Route names are not normalized, so the paths below are the real registered ones
rather than conventional ones.

---

## 1. Posts

Handles creation, retrieval, and management of posts.

### `GET /getposts`
- **Description**: Retrieves the main feed of posts for the authenticated user.
- **Auth**: Required (session cookie).
- **Response (200 OK)**: an array of the `repository.Posts` struct.
  ```json
  [
    {
      "id": 123,
      "user_id": 456,
      "username": "johndoe",
      "full_name": "John Doe",
      "avatar": "/uploads/avatar123.png",
      "title": "Hello world",
      "content": "This is my first post!",
      "privacy": "public",
      "image_path": "/uploads/post123.png",
      "created_at": "2023-11-01T10:00:00Z",
      "updated_at": "2023-11-01T10:00:00Z",
      "likes_count": 5,
      "dislikes_count": 0,
      "comments_count": 2,
      "userReaction": "like"
    }
  ]
  ```
  Fields are `snake_case` (`user_id`, `created_at`) except `userReaction`. `avatar`,
  `image_path` and `userReaction` are nullable; `group_id` and `group_title` only
  appear on posts belonging to a group.

### `POST /Createpost`
- **Description**: Creates a new post. The body is always `multipart/form-data`
  (the handler calls `ParseMultipartForm`), not JSON.
- **Auth**: Required (session cookie).
- **Payload**:
  | Field | Type | Required | Notes |
  | --- | --- | --- | --- |
  | `title` | text | yes | validated by `validatePostText` |
  | `content` | text | yes | validated by `validatePostText` |
  | `privacy` | text | no | `public` (default) or `private` |
  | image file | file | no | 10 MB max, saved under `backend/uploads/` |
- **Response (200 OK)**: the newly created post, in the same `repository.Posts` shape
  returned by `GET /getposts`. The handler does not send a `201`, it returns `200`.

---

## 2. Comments

*(To be defined)*

---

## 3. Followers

*(To be defined)*