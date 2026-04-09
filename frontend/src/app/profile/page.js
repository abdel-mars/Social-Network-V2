"use client";

import { useEffect, useState } from "react";
import { Mail, Cake, VenusAndMars, Lock, Globe, UserCheck, UserX, Clock } from "lucide-react";
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import styles from "./page.module.css";
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
  const [isPending, setIsPending] = useState(false);
  const [Pend, setPad] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("userId");
    setloggedInUserId(id);
  });

  const isOwnProfile = loggedInUserId === userId;
  const canSeePosts = isOwnProfile || Myfriend || (user && user.is_private === 0);

  useEffect(() => {
    if (!userId) return;
    async function fetchProfile() {
      try {
        const res = await fetch(`http://localhost:8080/profile?id=${userId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data.user);
        setFriends(data.isfriend);
        setPad(data.p);
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
        if (!canSeePosts) { setPosts([]); return; }
        const res = await fetch(`http://localhost:8080/GetCUser?id=${userId}`, { credentials: "include" });
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
      await fetch("http://localhost:8080/update-privacy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_private: newValue }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: Number(userId) }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json();
      if (data.status === "pending") { setIsPending(true); setFriends(false); }
      else if (data.status === "accepted") { setIsPending(false); setFriends(true); }
      else { setIsPending(false); setPad(false); setFriends(false); }
      setFollowersCount(data.followers_Count || 0);
      setFollowingCount(data.FollowingCount || 0);
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  if (!user) return (
    <div className={styles.pageRoot}>
      <Renderbar />
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className={styles.pageRoot}>
      <Renderbar />

      <div className={styles.pageContent}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          {/* Cover */}
          <div className={styles.cover}>
            {/* The cover now relies entirely on the pure CSS smooth gradient from styles.cover */}
          </div>

          {/* Profile body */}
          <div className={styles.profileBody}>
            {/* Avatar */}
            <div className={styles.avatarWrapper}>
              <img
                src={user.avatar ? `http://localhost:8080/${user.avatar}` : "/default-avatar.png"}
                alt={`${user.first_name} ${user.last_name}`}
                className={styles.avatar}
              />
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <div>
                  <h1 className={styles.fullName}>
                    {user.first_name} {user.last_name}
                    {user.nickname && <span className={styles.nickname}> ({user.nickname})</span>}
                  </h1>
                  <p className={styles.username}>@{user.username}</p>
                </div>

                <div className={styles.profileActions}>
                  {isOwnProfile ? (
                    <div className={styles.privacySelect}>
                      {isPrivate === 0 ? <Globe size={14} /> : <Lock size={14} />}
                      <select
                        value={isPrivate}
                        onChange={updatePrivacy}
                        className={styles.select}
                        id="privacy-select"
                      >
                        <option value={0}>Public</option>
                        <option value={1}>Private</option>
                      </select>
                    </div>
                  ) : (
                    <button
                      id="follow-toggle-btn"
                      className={`${styles.followBtn} ${(isPending || Pend) ? styles.pending : Myfriend ? styles.following : ""}`}
                      onClick={handleFollowToggle}
                    >
                      {(isPending || Pend) ? (
                        <><Clock size={15} /> Pending</>
                      ) : Myfriend ? (
                        <><UserX size={15} /> Unfollow</>
                      ) : (
                        <><UserCheck size={15} /> Follow</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {user.about && <p className={styles.about}>{user.about}</p>}

              {/* Stats */}
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{followersCount}</span>
                  <span className={styles.statLabel}>Followers</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{followingCount}</span>
                  <span className={styles.statLabel}>Following</span>
                </div>
              </div>

              {/* Details */}
              <div className={styles.detailsRow}>
                <div className={styles.detailChip}>
                  <Mail size={13} />
                  <span>{user.email}</span>
                </div>
                <div className={styles.detailChip}>
                  <Cake size={13} />
                  <span>{user.age} years old</span>
                </div>
                <div className={styles.detailChip}>
                  <VenusAndMars size={13} />
                  <span>{user.gender}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className={styles.postsSection}>
          <h2 className={styles.postsHeading}>Posts</h2>
          {posts && posts.length > 0 ? (
            <div className={styles.postsFeed}>
              {posts.map((post) => (
                <RenderPosts key={post.id} post={post} setPosts={setPosts} />
              ))}
            </div>
          ) : (
            <div className={styles.noPosts}>
              {!canSeePosts
                ? "🔒 This profile is private."
                : "No posts yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
