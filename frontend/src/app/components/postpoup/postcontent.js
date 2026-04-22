import { createPortal } from "react-dom";
import { AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { timeAgo } from "../../lib/time";
import { ImagePreview } from "../ui/ImagePreview";
import { ReactionButtons } from "../reactions/ReactionButtons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./postcontent.module.css";

export function PostModel({
  selectedPost,
  setSelectedPost,
  setPosts,
  comment,
  newComment,
  setNewComment,
  handleReaction,
}) {
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [editViewerIds, setEditViewerIds] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const postType = selectedPost?.group_id ? "group_post" : "post";
  const canManagePost = Number(currentUserId) === Number(selectedPost?.user_id);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem("userId");
    setCurrentUserId(storedUserId ? Number(storedUserId) : null);
  }, []);

  useEffect(() => {
    if (!selectedPost) return;
    setEditTitle(selectedPost.title || "");
    setEditContent(selectedPost.content || "");
    setEditPrivacy(selectedPost.privacy || "public");
    setEditViewerIds([]); // Clear because we don't have existing IDs easily
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [selectedPost]);

  useEffect(() => {
    if (isEditing && postType === "post" && followers.length === 0) {
      fetch("http://localhost:8080/my-followers", { credentials: "include" })
        .then(res => res.json())
        .then(data => setFollowers(data || []))
        .catch(err => console.error("Failed to fetch followers:", err));
    }
  }, [isEditing, postType, followers.length]);

  const toggleViewer = (id) => {
    if (editViewerIds.includes(id)) {
      setEditViewerIds(editViewerIds.filter(vId => vId !== id));
    } else {
      setEditViewerIds([...editViewerIds, id]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      const res = await fetch(
        `http://localhost:8080/posts/${selectedPost.id}/comments/comments?post_type=${postType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: newComment }),
        }
      );
      if (!res.ok) return;
      const newone = await res.json();
      if (!selectedPost.comments) selectedPost.comments = [];
      selectedPost.comments.push(newone);
      setSelectedPost({ ...selectedPost });
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      setSaving(true);
      const res = await fetch(
        postType === "group_post" ? "http://localhost:8080/group-post/update" : "http://localhost:8080/post/update",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          post_id: selectedPost.id,
          title: editTitle,
          content: editContent,
          privacy: editPrivacy,
          viewer_ids: editViewerIds,
        }),
      });
      if (!res.ok) throw new Error("Failed to update post");

      const updatedPost = await res.json();
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === updatedPost.id ? { ...post, ...updatedPost } : post))
      );
      setSelectedPost((prev) => ({ ...prev, ...updatedPost }));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update post:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        postType === "group_post" ? "http://localhost:8080/group-post/delete" : "http://localhost:8080/post/delete",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ post_id: selectedPost.id }),
      });
      if (!res.ok) throw new Error("Failed to delete post");

      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== selectedPost.id));
      setSelectedPost(null);
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!selectedPost) return null;

  return createPortal(
    <div className={styles.overlay} onClick={() => setSelectedPost(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div 
            className={styles.authorRow}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/profile?id=${selectedPost.user_id}`);
              setSelectedPost(null);
            }}
            style={{ cursor: "pointer", transition: "opacity 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            <img
              src={selectedPost.avatar ? `http://localhost:8080/${selectedPost.avatar}` : "/default-avatar.png"}
              alt="avatar"
              className={styles.avatar}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/default-avatar.png"; }}
            />
            <div>
              <div className={styles.authorName}>{selectedPost.full_name || selectedPost.user_name}</div>
              <div className={styles.postTime}>{timeAgo(selectedPost.created_at)}</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {canManagePost && (
              <>
                <button
                  type="button"
                  className={styles.manageBtn}
                  onClick={() => setIsEditing((prev) => !prev)}
                  disabled={saving}
                >
                  <Pencil size={16} />
                  {isEditing ? "Cancel Edit" : "Edit"}
                </button>
                <button
                  type="button"
                  className={`${styles.manageBtn} ${styles.deleteBtn}`}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            <button
              id="close-post-detail-btn"
              className={styles.closeBtn}
              onClick={() => setSelectedPost(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {isEditing ? (
            <div className={styles.editForm}>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={styles.editInput}
                placeholder="Post title"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={styles.editTextarea}
                placeholder="Post content"
                rows={5}
              />

              {postType === "post" && (
                <div style={{ marginTop: "10px", marginBottom: "10px" }}>
                  <select
                    value={editPrivacy}
                    onChange={(e) => setEditPrivacy(e.target.value)}
                    className={styles.editInput}
                    style={{ padding: "8px", appearance: "auto" }}
                  >
                    <option value="public">🌍 Public (Everyone)</option>
                    <option value="almost_private">👥 Almost Private (Followers Only)</option>
                    <option value="private">🔒 Private (Specific Followers)</option>
                  </select>

                  {editPrivacy === "private" && (
                    <div style={{ marginTop: "10px", background: "var(--bg-card)", padding: "10px", borderRadius: "8px" }}>
                      <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Select who can see this:</p>
                      {followers.length > 0 ? (
                        <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", padding: "10px", borderRadius: "8px" }}>
                          {followers.map(f => (
                            <label key={f.id} style={{ display: "flex", gap: "8px", cursor: "pointer", marginBottom: "6px" }}>
                              <input 
                                type="checkbox" 
                                checked={editViewerIds.includes(f.id)}
                                onChange={() => toggleViewer(f.id)}
                              />
                              {f.full_name || f.username}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>You have no followers to select.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.editActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className={styles.primaryBtn} onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={styles.title}>{selectedPost.title}</h3>
              <p className={styles.content}>{selectedPost.content}</p>
            </>
          )}

          {!isEditing && selectedPost.image_path && (
            <img
              src={`http://localhost:8080/${selectedPost.image_path}`}
              alt="Post"
              className={styles.image}
              onClick={() => setPreviewImage(`http://localhost:8080/${selectedPost.image_path}`)}
              style={{ cursor: "zoom-in" }}
            />
          )}

          {!isEditing && <div className={styles.reactions}>
            <ReactionButtons
              userReaction={selectedPost.userReaction}
              likesCount={selectedPost.likes_count}
              dislikesCount={selectedPost.dislikes_count}
              onReact={(reaction) => handleReaction(reaction, selectedPost.id, postType)}
            />
          </div>}
        </div>

        {/* Comments */}
        <div className={styles.commentsSection}>
          <h4 className={styles.commentsTitle}>Comments</h4>

          <div className={styles.commentsList}>
            {Array.isArray(comment) && comment.length > 0 ? (
              comment.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentMeta}>
                    <span 
                      className={styles.commentUser}
                      onClick={() => {
                        router.push(`/profile?id=${c.user_id}`);
                        setSelectedPost(null);
                      }}
                      style={{ cursor: "pointer", transition: "color 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.color = "var(--primary)"}
                      onMouseOut={(e) => e.currentTarget.style.color = ""}
                    >
                      @{c.user_name || c.user_id}
                    </span>
                    <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className={styles.commentText}>{c.text}</p>
                </div>
              ))
            ) : (
              <p className={styles.noComments}>No comments yet. Be the first!</p>
            )}
          </div>

          <div className={styles.commentInput}>
            <textarea
              id="new-comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className={styles.textarea}
              rows={2}
            />
            <button
              id="submit-comment-btn"
              onClick={handleAddComment}
              className={styles.submitBtn}
            >
              Post
            </button>
          </div>
        </div>

        {/* Fullscreen Image Preview */}
        {previewImage && (
          <ImagePreview 
            src={previewImage} 
            onClose={() => setPreviewImage(null)} 
          />
        )}

        {showDeleteConfirm && (
          <div className={styles.confirmOverlay} onClick={() => !saving && setShowDeleteConfirm(false)}>
            <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.confirmIcon}>
                <AlertTriangle size={18} />
              </div>
              <h4 className={styles.confirmTitle}>Delete this post?</h4>
              <p className={styles.confirmText}>
                {postType === "group_post"
                  ? "This will permanently remove the group post for every member."
                  : "This will permanently remove the post from the feed."}
              </p>
              <div className={styles.confirmButtons}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${styles.primaryBtn} ${styles.confirmDeleteBtn}`}
                  onClick={handleDeletePost}
                  disabled={saving}
                >
                  {saving ? "Deleting..." : "Delete Post"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
