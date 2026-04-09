"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
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
      <button className={styles.triggerBtn} onClick={() => setOpen(true)}>
        <Users size={16} />
        New Group
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Group</h3>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Nintendo Switch Hub"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <textarea
                  placeholder="What is this group about?"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                  className={styles.textarea}
                />
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
