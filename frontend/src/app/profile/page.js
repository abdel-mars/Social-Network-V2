"use client";

import { useEffect, useState } from "react";
import { Mail, Cake, VenusAndMars } from "lucide-react"
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import UsersList from "../components/usersuggestion/users_seg";
import styles from "./page.module.css"
import { useSearchParams } from "next/navigation";

export default function ProfilePage() {

  const [user, setUser] = useState(null);
  const [isPrivate, setIsPrivate] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [Myfriend, setFriends] = useState(false);
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const [loggedInUserId, setloggedInUserId] = useState(null);
  useEffect(() => {
    let id = localStorage.getItem("userId");
    setloggedInUserId(id)
  })
  const isOwnProfile = loggedInUserId === userId;
  const [isPending, setIsPending] = useState(false);
  const [Pend, setPad] = useState(false);
  const canSeePosts = isOwnProfile || Myfriend || (user && user.is_private === 0);


  useEffect(() => {
    if (!userId) return;
    async function fetchProfile() {
      try {
        const res = await fetch(`http://localhost:8080/profile?id=${userId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        console.log("Here is abouhhhhht when i will fetch the users profile")
        console.log(data)
        setUser(data.user);
        setFriends(data.isfriend);
        setPad(data.p)
        setIsPrivate(data.user.is_private);
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !user) return;

    async function fetchPosts() {
      try {
        if (!canSeePosts) {
          setPosts([]);
          return;
        }

        const res = await fetch(`http://localhost:8080/GetCUser?id=${userId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      }
    }

    fetchPosts();
  }, [userId, user?.is_private, Myfriend]);

  const updatePrivacy = async (e) => {
    const newValue = parseInt(e.target.value);
    setIsPrivate(newValue);
    try {
      const res = await fetch("http://localhost:8080/update-privacy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_private: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update privacy");
    } catch (err) {
      console.error(err);
      alert("Error updating privacy: " + err.message);
    }
  };

  const handleFollowToggle = async (e) => {
    try {
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: Number(userId) }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json();

      console.log("Here Is After Follow And Unfollow")
      console.log(data)

      if (data.status === "pending") {
        setIsPending(true);
        setFriends(false);

      } else if (data.status === "accepted") {
        setIsPending(false);
        setFriends(true);

      } else {
        setIsPending(false);
        setPad(false)
        setFriends(false);

      }
      setFollowersCount(data.followers_Count || 0);
      setFollowingCount(data.FollowingCount || 0);

    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };
  if (!user) return <p style={{ textAlign: "center", marginTop: 100, color: "#333" }}>Loading profile...</p>;
  return (
    <div className={styles.pageContainer}>
      <Renderbar />
      <div className={styles.profileContainer}>
        <div className={styles.profileCard}>

          <div className={styles.profileCoverPhoto}>
            <img src="cover.jpg" />
          </div>
          <div className={styles.profileDetails}>
            <div className={styles.profileLeft}>
              <div className={styles.profileAvatar}>
                {user.avatar ? (<img src={`http://localhost:8080/${user.avatar}`} alt={`${user.first_name} ${user.last_name}`} />):
                  (<img src={`default-avatar.png`} alt={`${user.first_name} ${user.last_name}`} />)
                }
              </div>
              <div className={styles.profileName}>
                <div className={styles.name}>
                  {user.first_name} {user.last_name} {user.nickname && `(${user.nickname})`}
                </div>
                <div className={styles.username}>@{user.username}</div>
                <div className={styles.about}>{user.about}</div>
              </div>
            </div>
            <div className={styles.profileFollowData}>
              <div className={styles.profileFollowBox}>
                <strong>Followers</strong>
                <p>{followersCount}</p>
              </div>
              <div className={styles.profileFollowBox}>
                <strong>Following</strong>
                <p>{followingCount}</p>
              </div>
            </div>
          </div>
          <div className={styles.profileFooter}>
            <div className={styles.profileExtra}>
              <div className={styles.detailContainer}>
                <Mail />
                <p>{user.email}</p>
              </div>
              <div className={styles.detailContainer}>
                <Cake />
                <p>{user.age} yo</p>
              </div>
              <div className={styles.detailContainer}>
                <VenusAndMars />
                <p>{user.gender}</p>
              </div>
            </div>
            <div className={styles.profileActions}>
              {isOwnProfile && (
                <div style={{ marginTop: 10 }}>
                  <label><strong>Profile Privacy:</strong></label>
                  <select value={isPrivate} onChange={updatePrivacy} style={{ marginLeft: 10 }}>
                    <option value={0}>Public</option>
                    <option value={1}>Private</option>
                  </select>
                </div>
              )}
              {!isOwnProfile && (
                // Here I Will Change This To Compenent Will Be Independent 
                <button style={{ marginTop: 10 }} onClick={handleFollowToggle} >
                  {(isPending || Pend) ? "Pending" : Myfriend ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Render posts */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <RenderPosts
                key={post.id}
                post={post}
                setPosts={setPosts}
              />
            ))
          ) : (
            <p style={{ textAlign: "center", color: "var(--paynes-gray)", marginTop: 20 }}>
              {!canSeePosts ? "This profile is private." : "This user has no posts yet."}
            </p>
          )}
        </section>

      </div>
      <aside>
        <UsersList />
      </aside>
    </div>
  );
}

