"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import styles from "./createGroup.module.css";
import { API_URL } from "../../lib/api";

export function CreateGroupModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/Create_Group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Title: title, Description: desc }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.text();
        alert("Error creating group: " + err);
        return;
      }

      const data = await res.json();
      setTitle("");
      setDesc("");
      setOpen(false);
      
      // Redirect to the new group detail page
      router.push(`/groups/${data.id}`);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Error creating group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className={styles.triggerBtn} onClick={() => setOpen(true)}>
        <Users size={16} />
        New Group
      </button>

{open
        ? createPortal(
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
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Group Name</label>
                      <span className={styles.charCount}>{title.length}/25</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Gamers"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      maxLength={25}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Description</label>
                      <span className={styles.charCount}>{desc.length}/100</span>
                    </div>
                    <textarea
                      placeholder="What is this group about?"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      required
                      maxLength={100}
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setOpen(false)} disabled={loading}>
                      Cancel
                    </button>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                      {loading ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
