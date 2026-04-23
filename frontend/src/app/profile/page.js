"use client";

import { useEffect, useState } from "react";
import { Mail, Cake, VenusAndMars, UserCheck, UserX, Clock, UserX2 } from "lucide-react";
import { RenderPosts } from "../components/posts/post";
import { Renderbar } from "../components/bar/bar";
import { FollowButton } from "../components/follow/FollowButton";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";

import { ProfileEditModal } from "../components/profile/ProfileEditModal";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isPrivate, setIsPrivate] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [Myfriend, setFriends] = useState(false);
  const [isFollower, setIsFollower] = useState(false); 
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const [loggedInUserId, setloggedInUserId] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [Pend, setPad] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let id = localStorage.getItem("userId");
    setloggedInUserId(id);
  }, []);

  const isOwnProfile = loggedInUserId === userId;
  const canSeePosts = isOwnProfile || Myfriend || (user && user.is_private === 0);

  useEffect(() => {
    if (!userId) {
      setError("No user ID provided.");
      return;
    }
    setError(null);
    setUser(null);
    async function fetchProfile() {
      try {
        const res = await fetch(`http://localhost:8080/profile?id=${userId}`, { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            res.status === 404
              ? "User not found."
              : res.status === 400
              ? "Invalid user ID."
              : body.message || "Something went wrong.";
          setError(msg);
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setFriends(data.isfriend);
        setPad(data.p);
        setIsFollower(data.is_follower);
        setIsPrivate(data.user.is_private);
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
      } catch (err) {
        console.error(err);
        setError("Could not load profile. Please try again.");
      }
    }
    fetchProfile();
  }, [userId]);

  // Real-time sync: listen for follow updates from other components
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.source === "profile") return;

      const profileId = Number(userId);

      // SCENARIO 1: WE (the logged-in user) changed our following status of THIS person
      if (e.detail && typeof e.detail.followed_id !== "undefined" && e.detail.followed_id === profileId) {
        const newStatus = e.detail.status;
        
        if (typeof e.detail.followers_count === "number") {
          setFollowersCount(e.detail.followers_count);
        }

        if (newStatus === "following" || newStatus === "accepted") {
          if (!Myfriend) { // Only increment if we weren't following before
            setFriends(true);
            setIsPending(false);
            setPad(false);
            // Only increment locally if we didn't get an authoritative count
            if (typeof e.detail.followers_count !== "number") {
              setFollowersCount(prev => prev + 1);
            }
          }
        } else if (newStatus === "pending") {
          setFriends(false);
          setIsPending(true);
          setPad(true);
        } else if (newStatus === "none" || newStatus === "not_following") {
          if (Myfriend) { // Only decrement if we were following before
            setFriends(false);
            setIsPending(false);
            setPad(false);
            if (typeof e.detail.followers_count !== "number") {
              setFollowersCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      }

      // SCENARIO 2: This person (follower_id) followed/unfollowed US
      if (e.detail && typeof e.detail.follower_id !== "undefined" && e.detail.follower_id === profileId) {
        if (e.detail.type === "follower_removed") {
          if (isFollower) { // Only decrement if they were a follower
            setIsFollower(false);
            if (isOwnProfile) setFollowersCount(prev => Math.max(0, prev - 1));
            else setFollowingCount(prev => Math.max(0, prev - 1));
          }
        } else if (e.detail.type === "follower_added") {
          if (e.detail.status === "accepted") {
            if (!isFollower) { // Only increment if they weren't a follower
              setIsFollower(true);
              if (isOwnProfile) setFollowersCount(prev => prev + 1);
              else setFollowingCount(prev => prev + 1);
            }
          } else {
            setIsFollower(false);
          }
        }
      }
    };
    window.addEventListener("followUpdated", handleUpdate);
    return () => window.removeEventListener("followUpdated", handleUpdate);
  }, [userId, Myfriend, isOwnProfile, isFollower, isPending, Pend]);

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

  const handleUpdateUser = (updatedData) => {
    setUser((prev) => ({
      ...prev,
      first_name: updatedData.first_name,
      last_name: updatedData.last_name,
      nickname: updatedData.nickname,
      about: updatedData.about,
      is_private: updatedData.is_private ? 1 : 0,
      avatar: updatedData.avatar,
    }));
    setIsPrivate(updatedData.is_private ? 1 : 0);
  };

  const handleFollowToggle = async () => {
    try {
      setFollowLoading(true);
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: Number(userId) }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json();
      
      const newStatus = data.status === "pending" ? "pending" : data.status === "accepted" ? "accepted" : "none";
      
      if (data.status === "pending") { 
        setIsPending(true); setFriends(false); setPad(true);
      }
      else if (data.status === "accepted") { 
        setIsPending(false); setFriends(true); setPad(false);
      }
      else { 
        setIsPending(false); setPad(false); setFriends(false); 
      }
      
      const updatedFollowers = data.followers_count ?? followersCount;
      const updatedFollowing = data.following_count ?? followingCount;
      setFollowersCount(updatedFollowers);
      setFollowingCount(updatedFollowing);
      
      window.dispatchEvent(new CustomEvent("followUpdated", { 
        detail: { 
          followed_id: Number(userId), 
          status: newStatus === "accepted" ? "following" : newStatus, 
          source: "profile",
          followers_count: updatedFollowers,
          following_count: updatedFollowing
        } 
      }));
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (error) return (
    <div className={styles.pageRoot}>
      <Renderbar />
      <div className={styles.errorState}>
        <div className={styles.errorIconWrapper}>
          <UserX2 size={48} strokeWidth={1.5} />
        </div>
        <h2 className={styles.errorTitle}>Oops!</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.errorBackBtn} onClick={() => window.history.back()}>
          ← Go Back
        </button>
      </div>
    </div>
  );

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
        <div className={styles.profileCard}>
          <div className={styles.cover}></div>

          <div className={styles.profileBody}>
            <div className={styles.avatarWrapper}>
              <img
                src={user.avatar ? `http://localhost:8080/${user.avatar}` : "/default-avatar.png"}
                alt={`${user.first_name} ${user.last_name}`}
                className={styles.avatar}
              />
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <div className={styles.nameInfo}>
                  <h1 className={styles.fullName}>
                    {user.first_name} {user.last_name}
                    {user.nickname && <span className={styles.nickname}> ({user.nickname})</span>}
                  </h1>
                  <p className={styles.username}>@{user.username}</p>
                </div>

                <div className={styles.profileActions}>
                  {isOwnProfile ? (
                    <button 
                      className={styles.editBtn} 
                      onClick={() => setEditModalOpen(true)}
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <FollowButton
                      status={(isPending || Pend) ? "pending" : Myfriend ? "accepted" : "not_following"}
                      onToggle={handleFollowToggle}
                      loading={followLoading}
                      isFollower={isFollower}
                    />
                  )}
                </div>
              </div>

              {user.about && <p className={styles.about}>{user.about}</p>}

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

        <div className={styles.postsSection}>
          <h2 className={styles.postsHeading}>Posts</h2>
          {posts && posts.length > 0 ? (
            <div className={styles.postsFeed}>
              {posts.map((post) => (
                <RenderPosts key={post.group_id ? `group_${post.id}` : `post_${post.id}`} post={post} setPosts={setPosts} />
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

      {isEditModalOpen && (
        <ProfileEditModal
          user={user}
          onClose={() => setEditModalOpen(false)}
          onUpdate={handleUpdateUser}
        />
      )}
    </div>
  );
}
