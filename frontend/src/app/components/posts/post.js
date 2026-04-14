"use client";

import styles from "./post.module.css";
import { ReactionButtons } from "../reactions/ReactionButtons";
import { timeAgo } from "../../lib/time";
import { useReactions } from "../../hooks/useReactions";
import { PostModel } from "../postpoup/postcontent";
import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ImagePreview } from "../ui/ImagePreview";

export function RenderPosts({ post, setPosts }) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [newComment, setNewcomment] = useState("");
  const [comments, setComments] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const { handleReaction } = useReactions({
    setPosts,
    selectedPost,
    setSelectedPost,
  });
  const postType = post.group_id ? "group_post" : "post";

  useEffect(() => {
    if (!selectedPost) return;
    async function fetchComments() {
      try {
        const res = await fetch(
          `http://localhost:8080/posts/${selectedPost.id}/comments?post_type=${selectedPost.group_id ? "group_post" : "post"}`,
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    }
    fetchComments();
  }, [selectedPost]);

  return (
    <>
      <div
        className={styles.postCard}
        onClick={() => setSelectedPost(post)}
      >
        {/* Author row */}
        <div className={styles.authorRow}>
          <img
            src={post.avatar ? `http://localhost:8080/${post.avatar}` : "/default-avatar.png"}
            alt="Avatar"
            className={styles.avatar}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/default-avatar.png"; }}
          />
        <div className={styles.authorInfo}>
          <span className={styles.authorName}>{post.full_name || post.user_name}</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className={styles.postTime}>{timeAgo(post.created_at)}</span>
            {post.privacy === "private" && (
              <span title="Private (Specific followers only)" style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                🔒 Private
              </span>
            )}
            {post.privacy === "almost_private" && (
              <span title="Almost Private (Followers only)" style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                👥 Followers
              </span>
            )}
          </div>
        </div>
        </div>

        {post.group_title && (
          <div className={styles.groupMeta}>
            Posted in <span className={styles.groupBadge}>{post.group_title}</span>
          </div>
        )}

        {/* Content */}
        <h3 className={styles.postTitle}>{post.title}</h3>
        <p className={styles.postContent}>{post.content}</p>

        {/* Image */}
        {post.image_path && (
          <img
            src={`http://localhost:8080/${post.image_path}`}
            alt="Post"
            className={styles.postImage}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(`http://localhost:8080/${post.image_path}`);
            }}
          />
        )}

        {/* Footer */}
        <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
          <ReactionButtons
            userReaction={post.userReaction}
            likesCount={post.likes_count}
            dislikesCount={post.dislikes_count}
            onReact={(reaction) => handleReaction(reaction, post.id, postType)}
          />
          <button className={styles.commentBtn} onClick={() => setSelectedPost(post)}>
            <MessageSquare size={15} />
            Comment
          </button>
        </div>
      </div>

      {selectedPost && (
        <PostModel
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          setPosts={setPosts}
          comment={comments}
          newComment={newComment}
          setNewComment={setNewcomment}
          handleReaction={handleReaction}
        />
      )}

      {/* Fullscreen Image Preview */}
      {previewImage && (
        <ImagePreview 
          src={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
      )}
    </>
  );
}
