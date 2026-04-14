# Project Audit: Social Network Implementation

This document provides a comprehensive audit of the current state of the Social Network project against the provided official subject requirements.

## 📝 Functional Audit

| Feature Area | Status | Implementation Details / Gaps |
| :--- | :---: | :--- |
| **Authentication** | ✅ | Implemented with Sessions/Cookies, hashing (bcrypt), and all required registration fields. |
| **Followers** | ✅ | Implemented with following/unfollowing, requests (accept/decline), and public vs private profile logic. |
| **Profile** | ✅ | Implemented with user info, activity feed, follower/following lists, and public/private toggle. |
| **Post Privacy** | ❌ | **Required:** `Public`, `Almost Private` (Followers Only), and `Private` (Specific Chosen followers). Currently missing. |
| **Groups** | ✅ | Basic groups, membership status (member, invited, requested), and discovery are implemented. |
| **Group Posts** | ✅ | Group-specific posts and comments are isolated from the main feed. |
| **Group Events** | ⚠️ | DB tables exist, but **Real-time Notifications** for event creation and a fully verified UI are needed. |
| **1v1 Chat** | ✅ | Real-time private messaging with WebSockets and emoji support is implemented. |
| **Group Chat** | ❌ | **Required:** A common chat room for all group members. Currently only 1v1 chat is available. |
| **Notifications** | ⚠️ | Notifications for follow/join requests exist. **Missing:** Notifications for group event creation. |
| **Infrastructure** | ✅ | Go Backend, Next.js Frontend, SQLite with migrations, and Dockerization are all present. |

---

## 🛠️ Technical Compliance

*   **Stateless Protocol**: Using cookies and sessions for persistent auth.
*   **Real-time Logic**: Private chat uses WebSockets; Notifications use SSE.
*   **Database**: SQLite used with a clear migration system (`golang-migrate` format).
*   **Docker**: Multi-container setup provided (Frontend + Backend).
*   **Image Extensions**: `JPEG`, `PNG`, and `GIF` are saved, but strict server-side validation is yet to be finalized.

---

## 🚀 Recommended Roadmap

To achieve 100% compliance with the subject, the following tasks are prioritized:

### 1. Post Privacy System
- **Database**: Add `privacy` and `viewer_ids` columns/tables to `posts`.
- **Backend**: Update create/get handlers to filter posts based on followers or specific IDs.
- **Frontend**: Add privacy selection dropdown to the "Create Post" modal.

### 2. Group Chat Implementation
- **Shared Hub**: Expansion of the WebSocket Hub to broadcast messages to all active group members.
- **Persistence**: New `group_messages` table to store history.
- **UI**: Dedicated chat tab inside the Group detail page.

### 3. Event Visibility & Alerts
- **Broadcasting**: Trigger a notification for every group member when a new event is created.
- **RSVP UI**: Ensure "Going" vs "Not Going" responses are easy to toggle and tracked correctly.

### 4. Technical Hardening
- **Validation**: Implement strict MIME type checks for image uploads.
- **Permissions**: Enforce the rule that private messages can only be sent if at least one user follows the other.
