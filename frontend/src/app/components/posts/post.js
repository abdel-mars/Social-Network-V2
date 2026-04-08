"use client";

import style from "./post.module.css"
import { ReactionButtons } from "../reactions/ReactionButtons";
import { timeAgo } from "../../lib/time";
import { useReactions } from "../../hooks/useReactions";
import { PostModel } from "../postpoup/postcontent";
import { useState , useEffect} from "react";

export function RenderPosts({ post , setPosts}) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [newComment, setNewcomment] = useState("");
  const [comments, setComments] = useState([]);

  const { handleReaction } = useReactions({
    setPosts,
    selectedPost,
    setSelectedPost,
  });

  useEffect(() => {
    if (!selectedPost) return;
    async function fetchComments() {
      try {
        const res = await fetch(
          `http://localhost:8080/posts/${selectedPost.id}/comments`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (!res.ok) {
          console.error("Error fetching comments:", await res.text());
          return;
        }
        const comments = await res.json();
        console.log("im at her when i want to set comment ");
        setComments(comments);
        console.log(comments);
        console.log("--------------------");
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    }

    fetchComments();
  }, [selectedPost]);
  return (
    <div
      key={post.id}
      className={style.postCard}
      onClick={() => setSelectedPost(post)}
    >
      <div className={style.postUserInfo} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={post.avatar ? `http://localhost:8080/${post.avatar}` : "/default-avatar.png"}
            alt="Avatar"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              marginRight: "8px",
            }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default-avatar.png";
            }}
          />
          <strong style={{ fontSize: "16px", color: "white" }}>
            {post.full_name || post.user_name}
          </strong>
        </div>
        <p style={{ fontSize: "12px", color: "white", margin: 0 }}>
          {timeAgo(post.created_at)}
        </p>
      </div>

      {/* Post Title */}
      <h3 style={{ margin: "8px 0", fontSize: "18px", color: "white" }}>{post.title}</h3>

      { }
      <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "14px", color: "white" }}>
        {post.content}
      </p>

      { }
      {post.image_path && (
        <img
          src={`http://localhost:8080/${post.image_path}`}
          alt="Post"
          style={{
            width: "100%",
            borderRadius: "10px",
            marginTop: "12px",
            objectFit: "cover",
            maxHeight: "400px",
          }}
          onClick={(e) => e.stopPropagation()} // prevent opening modal on image click
        />
      )}

      {/* Like/Dislike Buttons */}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <ReactionButtons
          userReaction={post.userReaction}
          likesCount={post.likes_count}
          dislikesCount={post.dislikes_count}
          onReact={(reaction) => handleReaction(reaction, post.id)}
        />
      </div>
      {selectedPost && (
        <PostModel
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          // handleAddComment={handleAddComment}
          comment={comments}
          newComment={newComment}
          setNewComment={setNewcomment}
          handleReaction={handleReaction}
        ></PostModel>
      )}
    </div>
  );
}
