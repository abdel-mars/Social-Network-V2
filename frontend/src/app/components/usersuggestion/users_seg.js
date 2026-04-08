"use client";
import { useState, useEffect } from "react";
import style from "./users_seg.module.css";
import { FollowButton } from "../follow/FollowButton";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:8080/users-sug", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();
        setUsers(data);

        // initialize follow state based on backend data
        const initialFollow = {};
        data?.forEach((u) => {
          // assume u.follow_status is returned from backend: "accepted", "pending", "not_following"
          initialFollow[u.user_id] = u.follow_status || "not_following";
        });
        setFollowing(initialFollow);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const handleFollowToggle = async (user_id) => {
    try {
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: user_id }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json(); 
      // data = { following: true/false, status: "pending"|"accepted" }
      // update follow state
      setFollowing((prev) => ({
        ...prev,
        [user_id]: data.status || (data.following ? "accepted" : "not_following"),
      }));

    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <aside className={style.rightSidebar}>
      <div className={style.usersCard}>
        <h3>Suggested Friends</h3>
        <div className={style.usersList}>
          {users?.length === 0 ? (
            <div className={style.usersListEmpty}>
              <p>No users found.</p>
            </div>
          ) : (
            users?.map((u) => {
              const status = following[u.user_id]; // "accepted" | "pending" | "not_following"
              return (
                <div key={u.user_id} className={style.userSug}>
                  <div className={style.userSugProfile}>
                    <img
                      src={
                        u.image_path
                          ? `http://localhost:8080/${u.image_path}`
                          : "/default-avatar.png"
                      }
                      alt={u.username}
                      className={style.userAvatar}
                    />
                    <div>
                      <strong className={style.userNameSug}>
                        {u.username}
                      </strong>
                      <div style={{ fontSize: "0.9em", color: "#555" }}>
                        {u.full_name || "No name"}
                      </div>
                    </div>
                  </div>
                  <FollowButton
                    status={status || "not_following"}
                    onToggle={() => handleFollowToggle(u.user_id)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}