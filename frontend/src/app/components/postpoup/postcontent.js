import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { timeAgo } from "../../lib/time";
import { ReactionButtons } from "../reactions/ReactionButtons";
import { ImagePreview } from "../ui/ImagePreview";
import { useState } from "react";
import styles from "./postcontent.module.css";

export function PostModel({
  selectedPost,
  setSelectedPost,
  comment,
  newComment,
  setNewComment,
  handleReaction,
}) {
  const [previewImage, setPreviewImage] = useState(null);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      const res = await fetch(
        `http://localhost:8080/posts/${selectedPost.id}/comments/comments`,
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

  if (!selectedPost) return null;

  return createPortal(
    <div className={styles.overlay} onClick={() => setSelectedPost(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.authorRow}>
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
          <button
            id="close-post-detail-btn"
            className={styles.closeBtn}
            onClick={() => setSelectedPost(null)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          <h3 className={styles.title}>{selectedPost.title}</h3>
          <p className={styles.content}>{selectedPost.content}</p>

          {selectedPost.image_path && (
            <img
              src={`http://localhost:8080/${selectedPost.image_path}`}
              alt="Post"
              className={styles.image}
              onClick={() => setPreviewImage(`http://localhost:8080/${selectedPost.image_path}`)}
              style={{ cursor: "zoom-in" }}
            />
          )}

          <div className={styles.reactions}>
            <ReactionButtons
              userReaction={selectedPost.userReaction}
              likesCount={selectedPost.likes_count}
              dislikesCount={selectedPost.dislikes_count}
              onReact={(reaction) => handleReaction(reaction, selectedPost.id)}
            />
          </div>
        </div>

        {/* Comments */}
        <div className={styles.commentsSection}>
          <h4 className={styles.commentsTitle}>Comments</h4>

          <div className={styles.commentsList}>
            {Array.isArray(comment) && comment.length > 0 ? (
              comment.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentUser}>User #{c.user_id}</span>
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
      </div>
    </div>,
    document.body
  );
}
