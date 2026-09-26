import { createPortal } from "react-dom";
import { AlertTriangle, Globe, Image, Lock, Pencil, Trash2, Users, X } from "lucide-react";
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
  setComments,
  newComment,
  setNewComment,
  handleReaction,
}) {
  const router = useRouter();
  const privacyOptions = [
    {
      value: "public",
      label: "Public",
      description: "Visible to everyone",
      icon: Globe,
    },
    {
      value: "almost_private",
      label: "Followers",
      description: "Visible to followers",
      icon: Users,
    },
    {
      value: "private",
      label: "Selected",
      description: "Visible to specific followers",
      icon: Lock,
    },
  ];
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
  const [commentImage, setCommentImage] = useState(null);
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
    if ((!newComment.trim() && !commentImage) || !selectedPost) return;

    try {
      const formData = new FormData();
      formData.append("content", newComment);
      if (commentImage) {
        formData.append("image", commentImage);
      }

      const res = await fetch(
        `http://localhost:8080/posts/${selectedPost.id}/comments?post_type=${postType}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );
      if (!res.ok) return;
      const newone = await res.json();
      setComments((prev) => [...(Array.isArray(prev) ? prev : []), newone]);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === selectedPost.id
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        )
      );
      setSelectedPost((prev) =>
        prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev
      );
      setNewComment("");
      setCommentImage(null);
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
                maxLength={100}
                rows={5}
              />

              {postType === "post" && (
                <div className={styles.privacySection}>
                  <div className={styles.privacyLabel}>Audience</div>
                  <div className={styles.privacyOptions}>
                    {privacyOptions.map((option) => {
                      const Icon = option.icon;
                      const active = editPrivacy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`${styles.privacyOption} ${active ? styles.privacyOptionActive : ""}`}
                          onClick={() => setEditPrivacy(option.value)}
                          aria-pressed={active}
                        >
                          <span className={styles.privacyIcon}>
                            <Icon size={16} />
                          </span>
                          <span className={styles.privacyText}>
                            <span className={styles.privacyTitle}>{option.label}</span>
                            <span className={styles.privacyDescription}>{option.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {editPrivacy === "private" && (
                    <div className={styles.followersSelection}>
                      <p className={styles.followersTitle}>Choose followers</p>
                      {followers.length > 0 ? (
                        <div className={styles.followersList}>
                          {followers.map(f => (
                            <label key={f.id} className={styles.followerItem}>
                              <input
                                className={styles.followerCheckbox}
                                type="checkbox" 
                                checked={editViewerIds.includes(f.id)}
                                onChange={() => toggleViewer(f.id)}
                              />
                              <span className={styles.followerName}>{f.full_name || f.username}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyFollowers}>You have no followers to select.</p>
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
          <h4 className={styles.commentsTitle}>Comments ({selectedPost.comments_count ?? comment?.length ?? 0})</h4>

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
                  {c.image_path && (
                    <img
                      src={`http://localhost:8080/${c.image_path}`}
                      alt="Comment attachment"
                      className={styles.commentImage}
                      onClick={() => setPreviewImage(`http://localhost:8080/${c.image_path}`)}
                    />
                  )}
                  <div className={styles.commentActions}>
                    <button 
                      className={`${styles.commentReactBtn} ${c.userReaction === 'like' ? styles.commentReacted : ''}`}
                      onClick={async () => {
                        const targetType = postType === "group_post" ? "group_post_comment" : "comment";
                        try {
                          const res = await fetch("http://localhost:8080/reactions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ post_id: c.id, reaction: "like", post_type: targetType }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const newComments = comment.map(cmt => 
                              cmt.id === c.id
                                ? {
                                    ...cmt,
                                    likes_count: data.likes_count,
                                    dislikes_count: data.dislikes_count,
                                    userReaction: data.userReaction,
                                  }
                                : cmt
                            );
                            setComments(newComments);
                          }
                        } catch (err) {
                          console.error("Failed to react to comment", err);
                        }
                      }}
                      title="Like comment"
                    >
                      <svg 
                        width="14" height="14" viewBox="0 0 24 24" 
                        fill={c.userReaction === 'like' ? "currentColor" : "none"} 
                        stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {c.likes_count > 0 && <span>{c.likes_count}</span>}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noComments}>No comments yet. Be the first!</p>
            )}
          </div>

          <div className={styles.commentInputContainer}>
            {commentImage && (
              <div className={styles.previewContainer}>
                <img src={URL.createObjectURL(commentImage)} className={styles.commentPreview} alt="Preview" />
                <button className={styles.removePreview} onClick={() => setCommentImage(null)}>
                  <X size={12} />
                </button>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {commentImage.name.length > 10 
                    ? commentImage.name.substring(0, 10) + "..." 
                    : commentImage.name}
                </span>
              </div>
            )}
            <div className={styles.commentInput}>
              <textarea
                id="new-comment-input"
                value={newComment}
                onChange={(e) => {
                  if (e.target.value.length <= 300) {
                    setNewComment(e.target.value);
                  }
                }}
                placeholder="Write a comment..."
                className={styles.textarea}
                rows={1}
              />
              <div className={styles.commentActions}>
                <span className={`${styles.charCount} ${newComment.length >= 280 ? styles.limit : ""}`}>
                  {300 - newComment.length}
                </span>
                <label className={styles.imageUploadBtn} htmlFor="comment-image-input" title="Attach image (max 1)">
                  <Image size={18} />
                  <input
                    id="comment-image-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) setCommentImage(file);
                    }}
                  />
                </label>
                <button
                  id="submit-comment-btn"
                  onClick={handleAddComment}
                  className={styles.submitBtn}
                  disabled={!newComment.trim() && !commentImage}
                >
                  Post
                </button>
              </div>
            </div>
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
