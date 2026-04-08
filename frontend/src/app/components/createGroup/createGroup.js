"use client";

import { useState } from "react";
import styles from "./createGroup.module.css";


export function CreateGroupModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("http://localhost:8080/Create_Group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Title: title, Description: desc }),
      credentials: "include",
    });

    setTitle("");
    setDesc("");
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>+ Create Group</button>

      {open && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3>Create Group</h3>
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={styles.input}
              />
              <textarea
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
                className={styles.textarea}
              />
              <div className={styles.buttons}>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
