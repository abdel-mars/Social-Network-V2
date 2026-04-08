"use client";

import { useEffect, useState } from "react";
import GroupCard from "../components/groupcard/groupcard";
import { Renderbar } from "../components/bar/bar";
import UsersList from "../components/usersuggestion/users_seg"
import { CreateGroupModal } from "../components/createGroup/createGroup";
import styles from "./page.module.css";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    async function fetchGroups() {
      const res = await fetch("http://localhost:8080/Get_Groups", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unauthorized or fetch failed");
      const data = await res.json();
      console.log("The Groups It's Her ...", data)
      setGroups(data);
    }
    fetchGroups();
  }, []);

  return (
    <div className={styles.groupsContainer}>
      <Renderbar />
      <div className={styles.groupsList}>
        <CreateGroupModal />
        {groups?.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
      <UsersList />
    </div>
  );
}

