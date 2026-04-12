"use client";

export function useReactions({ setPosts, selectedPost, setSelectedPost }) {
  const handleReaction = async (reaction, postId, postType = "post") => {
    try {
      const res = await fetch("http://localhost:8080/reactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, reaction, post_type: postType }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error("Server error: " + text);
      const data = JSON.parse(text);

      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes_count: data.likes_count,
                dislikes_count: data.dislikes_count,
                userReaction: data.userReaction,
              }
            : p
        )
      );
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) => ({
          ...prev,
          likes_count: data.likes_count,
          dislikes_count: data.dislikes_count,
          userReaction: data.userReaction,
        }));
      }
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  return { handleReaction };
}
