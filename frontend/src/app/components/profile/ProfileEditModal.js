"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera } from "lucide-react";
import styles from "./ProfileEditModal.module.css";

export function ProfileEditModal({ user, onClose, onUpdate }) {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [nickname, setNickname] = useState(user.nickname || "");
  const [about, setAbout] = useState(user.about || "");
  const [isPrivate, setIsPrivate] = useState(user.is_private || 0);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.avatar ? `http://localhost:8080/${user.avatar}` : "/default-avatar.png");
  const [submitting, setSubmitting] = useState(false);

  // ... (existing logic remains same)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("nickname", nickname);
    formData.append("about", about);
    formData.append("is_private", isPrivate);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("http://localhost:8080/profile/update", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate(data);
        onClose();
      } else {
        const errorText = await res.text();
        console.error("Failed to update profile:", errorText);
        alert("Failed to update profile. Please try again.");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Profile</h2>
          <button className={styles.closeBtn} onClick={onClose} id="close-profile-modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              <img src={previewUrl} alt="Avatar Preview" className={styles.avatarPreview} />
              <label htmlFor="avatar-upload" className={styles.avatarLabel} title="Change Photo">
                <Camera size={20} />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
              </label>
            </div>
            <p className={styles.hint}>Click the camera icon to update your photo</p>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>About</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.privacyField}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isPrivate === 1}
                onChange={(e) => setIsPrivate(e.target.checked ? 1 : 0)}
              />
              <span className={styles.checkboxTitle}>Private Profile</span>
            </label>
            <p className={styles.privacyHint}>
              When active, only accepted followers can view your detailed activities.
            </p>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
