"use client";

import { useState, useEffect } from "react";
import style from "./page.module.css";
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import { Renderformpost } from "../components/createpost/Createpost";
import UsersList from "../components/usersuggestion/users_seg";
import { CreateGroupModal } from "../components/createGroup/createGroup";
 

export default function Home() {

  const [posts, setPosts] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("http://localhost:8080/getposts", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          console.log("Im... At... The... Get... Posts");
          console.log("------------------------------------------------------");
          console.log(data);
          console.log("------------------------------------------------------");

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
    if (imageFile) {
      formData.append("image", imageFile);
    }

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
      console.log("Hello  Im her from when i added newpost");
      // ====>
      console.log(data);
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
    <div className={style.homeContainer}>
      {/* Left Sidebar*/}
      <Renderbar/>
      {/* Main Feed */}
      <main className={style.homeMain}>
        <header className={style.homeHeader}>
          <h1>Welcome to 01Social!</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className={style.createPostButton}
          >
            Create Post
          </button>
          <CreateGroupModal/>
        </header>
        {/* Button to open modal */}
        {/* Create Post Modal */}

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
        {/* Posts List */}
        <section className={style.postsFeed}>
          {posts.map((post) => (
            <RenderPosts
              key={post.id}
              post={post}
              setPosts={setPosts}
            />
          ))}
        </section>
        {/*<--||-->*/}
        
      </main>
      {/* Right Sidebar */}
      <aside>
        <UsersList></UsersList>
      </aside>
      {/*Here I Will Test Notification Panel <!!!> */}
      {/* <NotificationPanel
        notifications={notifications}
        setNotifications={setNotifications}
      ></NotificationPanel> */}
    </div>
  );
}
