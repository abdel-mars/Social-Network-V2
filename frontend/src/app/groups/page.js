"use client";

import { useEffect, useState } from "react";
import GroupCard from "../components/groupcard/groupcard";
import { Renderbar } from "../components/bar/bar";
import UsersList from "../components/usersuggestion/users_seg";
import FriendsList from "../components/friendlist/friendlist";
import { CreateGroupModal } from "../components/createGroup/createGroup";
import Toast from "../components/ui/Toast";
import { Users } from "lucide-react";
import styles from "./page.module.css";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [toast, setToast] = useState(null);
  
  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch("http://localhost:8080/Get_Groups", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Unauthorized or fetch failed");
        const data = await res.json();
        setGroups(data || []);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    }
    fetchGroups();
  }, []);

  useEffect(() => {
    const savedToast = window.sessionStorage.getItem("groupsToast");
    if (!savedToast) return;

    try {
      const parsedToast = JSON.parse(savedToast);
      if (parsedToast?.message) {
        setToast(parsedToast);
      }
    } catch (err) {
      console.error("Failed to parse groups toast:", err);
    } finally {
      window.sessionStorage.removeItem("groupsToast");
    }
  }, []);

  return (
    <div className={styles.pageRoot}>
      <Renderbar />
      <div className={styles.pageContent}>
        
        {/* Main groups area */}
        <main className={styles.mainFeed}>
          <div className={styles.headerRow}>
            <h1 className={styles.pageTitle}>Discover Groups</h1>
            <CreateGroupModal />
          </div>

          <div className={styles.groupsGrid}>
            {groups.length > 0 ? (
              groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No groups available yet.</p>
              </div>
            )}
          </div>
        </main>

        {/* Right sidebar */}
        <aside className={styles.rightPanel}>
          <div className={styles.rightCard}>
            <h3 className={styles.rightCardTitle}>
              <Users size={16} />
              Suggested Friends
            </h3>
            <UsersList />
          </div>
          <div className={styles.rightCard}>
            <FriendsList />
          </div>
        </aside>

      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
