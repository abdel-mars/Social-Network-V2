"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Renderbar } from "../../components/bar/bar";
import { Renderformpost } from "../../components/createpost/Createpost";
import { RenderPosts } from "../../components/posts/post";
import GroupCard from "../../components/groupcard/groupcard";
import { PenSquare, Users } from "lucide-react";
import styles from "./groupdetail.module.css";
// use global styles where handy if needed, but groupdetail.module.css is primary

export default function GroupDetailsPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [groupe_id, setGroupe_id] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [IsMember, setIsMember] = useState(false);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`http://localhost:8080/Get_Group_By_ID?id=${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch group details");
        const data = await res.json();
        setIsMember(data.group.is_member);
        setGroup(data);
        setGroupe_id(data.group);
      } catch (err) {
        console.error(err);
      }
    }
    fetchGroup();
  }, [id]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("content", newContent);
    if (imageFile) {
      formData.append("image", imageFile);
    }
    formData.append("group_id", id);
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

  if (!group) {
    return (
      <div className={styles.pageRoot}>
        <Renderbar />
        <div className={styles.loading}>Loading group details...</div>
      </div>
    );
  }

  const { group: g, members } = group;

  return (
    <div className={styles.pageRoot}>
      <Renderbar />

      <div className={styles.pageContent}>
        {/* Main Feed Column */}
        <div className={styles.mainCol}>
          <div className={styles.groupHeader}>
            <div>
              <h1 className={styles.groupTitle}>{g.title}</h1>
              <span className={styles.adminTag}>Admin: {g.admin.username}</span>
            </div>
          </div>

          {!IsMember ? (
            <>
              <div className={styles.nonMemberAlert}>
                You must join this group to see its posts.
              </div>
              <GroupCard group={groupe_id} Clickable={false} />
            </>
          ) : (
            <>
              {/* Create Post Prompt */}
              <div className={styles.createPrompt} onClick={() => setIsModalOpen(true)}>
                <div className={styles.promptText}>Got something to share with the group?</div>
                <button className={styles.promptBtn}>
                  <PenSquare size={15} />
                  Post
                </button>
              </div>

              {/* Posts list */}
              <div className={styles.postsFeed}>
                {posts.length === 0 ? (
                  <p className={styles.loading}>No posts found.</p>
                ) : (
                  posts.map((post) => (
                    <RenderPosts
                      key={post.id}
                      post={post}
                      setPosts={setPosts}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Side Column - Members */}
        <div className={styles.sideCol}>
          <h2 className={styles.sideTitle}>
            <Users size={18} style={{ display: "inline", marginRight: "8px" }} />
            Members ({members?.length || 0})
          </h2>
          <div className={styles.membersList}>
            {members?.map((m) => (
              <div key={m.id} className={styles.memberItem}>
                <div>
                  <div className={styles.memberName}>{m.first_name} {m.last_name}</div>
                  <div className={styles.memberUsername}>@{m.username}</div>
                </div>
                <div className={styles.memberStatus}>{m.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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