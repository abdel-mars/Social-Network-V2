"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Users } from "lucide-react";
import Toast from "../components/ui/Toast";
import style from "./page.module.css";
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import { Renderformpost } from "../components/createpost/Createpost";
import FriendsList from "../components/friendlist/friendlist";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [viewerIds, setViewerIds] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [toast, setToast] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("login") === "success") {
      setToast({ message: "Login successful!", type: "success" });
      router.replace("/home"); // clear query param smoothly
    }
  }, [searchParams, router]);

  const hydrateCommentCounts = async (postsToHydrate) => {
    const hydratedPosts = await Promise.all(
      (postsToHydrate || []).map(async (post) => {
        try {
          const postType = post.group_id ? "group_post" : "post";
          const res = await fetch(
            `http://localhost:8080/posts/${post.id}/comments?post_type=${postType}`,
            { credentials: "include" }
          );

          if (!res.ok) {
            return {
              ...post,
              comments_count: typeof post.comments_count === "number" ? post.comments_count : 0,
            };
          }

          const comments = await res.json();
          return {
            ...post,
            comments_count: Array.isArray(comments) ? comments.length : 0,
          };
        } catch (err) {
          return {
            ...post,
            comments_count: typeof post.comments_count === "number" ? post.comments_count : 0,
          };
        }
      })
    );

    return hydratedPosts;
  };

  const fetchPosts = async (currentOffset) => {
    if (loading || (!hasMore && currentOffset !== 0)) return;
    setLoading(true);
    // Artificial delay to make scroll feel smoother
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const res = await fetch(`http://localhost:8080/getposts?limit=10&offset=${currentOffset}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const hydratedData = await hydrateCommentCounts(Array.isArray(data) ? data : []);
        if (hydratedData.length < 10) {
          setHasMore(false);
        }
        setPosts((prev) => {
          if (currentOffset === 0) return hydratedData;
          const combined = [...prev, ...hydratedData];
          // Ensure unique posts by ID
          return Array.from(new Map(combined.map(p => [`${p.group_id ? "group" : "post"}_${p.id}`, p])).values());
        });
        setOffset(currentOffset + hydratedData.length);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchFollowers() {
      try {
        const res = await fetch("http://localhost:8080/my-followers", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setFollowers(data);
        }
      } catch (err) {
        console.error("Failed to fetch followers:", err);
      }
    }
    fetchPosts(0);
    fetchFollowers();
  }, []);

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        if (hasMore && !loading) {
          fetchPosts(offset);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset, hasMore, loading]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("content", newContent);
    formData.append("privacy", privacy);
    if (privacy === "private") {
      formData.append("viewer_ids", JSON.stringify(viewerIds));
    }
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await fetch("http://localhost:8080/Createpost", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        alert("Error: " + err);
        return;
      }
      const data = await res.json();
      setPosts((prev) => {
        // Prevent adding duplicate if post already exists in state
        if (prev.find(p => p.id === data.id)) return prev;
        return [data, ...prev];
      });
      setNewTitle("");
      setNewContent("");
      setImageFile(null);
      setPrivacy("public");
      setViewerIds([]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to create post:", err);
    }
  };

  return (
    <div className={style.pageRoot}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Renderbar />

      <div className={style.pageContent}>
        {/* Main feed */}
        <main className={style.feed}>
          {/* Create post prompt */}
          <div className={style.createPrompt} onClick={() => setIsModalOpen(true)}>
            <div className={style.promptText}>What's on your mind?</div>
            <button id="create-post-btn" className={style.promptBtn}>
              <PenSquare size={15} />
              Post
            </button>
          </div>

          {/* Post list */}
          <section className={style.postsFeed}>
            {posts.length === 0 ? (
              <div className={style.emptyFeed}>
                <p>No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              posts.map((post) => (
                <RenderPosts key={post.group_id ? `group_${post.id}` : `post_${post.id}`} post={post} setPosts={setPosts} />
              ))
            )}
          </section>
          {loading && <div className={style.loading}>Loading more posts...</div>}
        </main>

        {/* Right panel */}
        <aside className={style.rightPanel}>
          <div className={style.rightCard}>
            <h3 className={style.rightCardTitle}>
              <Users size={16} />
              Friends List
            </h3>
            <FriendsList />
          </div>
        </aside>
      </div>

      {/* Create post modal */}
      {isModalOpen && (
        <Renderformpost
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newContent={newContent}
          setNewContent={setNewContent}
          handleCreatePost={handleCreatePost}
          onClose={() => setIsModalOpen(false)}
          imageFile={imageFile}
          setImageFile={setImageFile}
          privacy={privacy}
          setPrivacy={setPrivacy}
          viewerIds={viewerIds}
          setViewerIds={setViewerIds}
          followers={followers}
        />
      )}
    </div>
  );
}
