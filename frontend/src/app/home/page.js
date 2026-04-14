"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Users } from "lucide-react";
import Toast from "../components/ui/Toast";
import style from "./page.module.css";
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import { Renderformpost } from "../components/createpost/Createpost";
import UsersList from "../components/usersuggestion/users_seg";
import FriendsList from "../components/friendlist/friendlist";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [toast, setToast] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("login") === "success") {
      setToast({ message: "Login successful!", type: "success" });
      router.replace("/home"); // clear query param smoothly
    }
  }, [searchParams, router]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("http://localhost:8080/getposts", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      }
    }
    fetchPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("content", newContent);
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
      setPosts([data, ...posts]);
      setNewTitle("");
      setNewContent("");
      setImageFile(null);
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
            <div className={style.promptAvatar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
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
        </main>

        {/* Right panel */}
        <aside className={style.rightPanel}>
          <div className={style.rightCard}>
            <h3 className={style.rightCardTitle}>
              <Users size={16} />
              Suggested Friends
            </h3>
            <UsersList />
          </div>
          <div className={style.rightCard}>
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
        />
      )}
    </div>
  );
}
