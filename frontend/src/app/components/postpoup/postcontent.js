import { timeAgo } from "../../lib/time";
import { ReactionButtons } from "../reactions/ReactionButtons";

export function PostModel({
  selectedPost,
  setSelectedPost,
  comment,
  newComment,
  setNewComment,
  handleReaction,
}) {

  const handleAddComment = async () => {
    if (!newComment.trim()) return; // ignore empty comments
    if (!selectedPost) return;

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
      if (!res.ok) {
        const err = await res.text();
        alert("Error adding comment: " + err);
        return;
      }
      console.log("her is the comment who is come from database");
      const newone = await res.json(); // the created comment returned from backend
      console.log(newComment);
      // Update front-end state
      if (!selectedPost.comments) selectedPost.comments = [];
      selectedPost.comments.push(newone);
      setSelectedPost({ ...selectedPost });
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1001,
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="card"
        style={{
          width: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          backgroundColor: "var(--platinum)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedPost(null);
          }}
          className="btn"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            backgroundColor: "transparent",
            color: "var(--paynes-gray)",
            fontSize: "18px",
            padding: "4px 8px",
          }}
        >
          ✕
        </button>

        {/* Post Header */}
        <div
          style={{
            borderBottom: "1px solid var(--french-gray)",
            paddingBottom: "12px",
          }}
        >
          <strong style={{ fontSize: "16px", color: "var(--outer-space)" }}>
            {selectedPost.full_name || selectedPost.user_name}
          </strong>
          <p
            style={{
              fontSize: "12px",
              color: "var(--paynes-gray)",
              margin: "4px 0 0",
            }}
          >
            {timeAgo(selectedPost.created_at)}
          </p>
        </div>

        {/* Post Content */}
        <div>
          <h3
            style={{
              fontSize: "18px",
              color: "var(--outer-space)",
              margin: "8px 0",
            }}
          >
            {selectedPost.title}
          </h3>
          <p
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.6",
              fontSize: "14px",
              color: "var(--paynes-gray)",
            }}
          >
            {selectedPost.content}
          </p>
        </div>
        {}
        {selectedPost.image_path && (
          <img
            src={`http://localhost:8080/${selectedPost.image_path}`}
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

        <ReactionButtons
          userReaction={selectedPost.userReaction}
          likesCount={selectedPost.likes_count}
          dislikesCount={selectedPost.dislikes_count}
          onReact={(reaction) => handleReaction(reaction, selectedPost.id)}
        />
        <div>
          <h4
            style={{
              fontSize: "16px",
              marginBottom: "12px",
              color: "var(--outer-space)",
            }}
          >
            Comments
          </h4>
          {comment &&
            comment.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{
                  marginBottom: "8px",
                  fontSize: "14px",
                  backgroundColor: "var(--french-gray)",
                }}
              >
                <strong style={{ color: "var(--blue-munsell)" }}>
                  User #{c.user_id}
                </strong>
                <span
                  style={{
                    color: "var(--paynes-gray)",
                    fontSize: "12px",
                    marginLeft: "8px",
                  }}
                >
                  {timeAgo(c.created_at)}
                </span>
                <p style={{ marginTop: "4px" }}>{c.text}</p>
              </div>
            ))}
          <textarea
            className="textarea"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            style={{
              width: "100%",
              marginTop: "12px",
              minHeight: "80px",
            }}
          />
          <button
            onClick={() => handleAddComment(selectedPost.id)}
            className="btn btn-primary"
            style={{ marginTop: "8px" }}
          >
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
}
