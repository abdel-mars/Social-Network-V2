"use client";

import { X, Image, Globe, Users, Lock } from "lucide-react";
import styles from "./Createpost.module.css";

export function Renderformpost({
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  handleCreatePost,
  onClose,
  imageFile,
  setImageFile,
  privacy,
  setPrivacy,
  viewerIds,
  setViewerIds,
  followers,
}) {
  const privacyOptions = [
    {
      value: "public",
      label: "Public",
      description: "Visible to everyone",
      icon: Globe,
    },
    {
      value: "almost_private",
      label: "Followers",
      description: "Visible to followers",
      icon: Users,
    },
    {
      value: "private",
      label: "Selected",
      description: "Visible to specific followers",
      icon: Lock,
    },
  ];

  const toggleViewer = (id) => {
    if (viewerIds.includes(id)) {
      setViewerIds(viewerIds.filter((vId) => vId !== id));
    } else {
      setViewerIds([...viewerIds, id]);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Post</h2>
          <button id="close-post-modal-btn" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreatePost} className={styles.form}>
<div className={styles.inputWrapper}>
            <input
              type="text"
              id="post-title-input"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={styles.input}
              maxLength={25}
              required
            />
            <span className={`${styles.charCounter} ${newTitle.length >= 25 ? styles.charCounterLimit : ""}`}>
              {newTitle.length}/25
            </span>
          </div>

          <div className={styles.textareaWrapper}>
            <textarea
              id="post-content-input"
              placeholder="What's on your mind?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className={styles.textarea}
              maxLength={100}
              required
            />
            <span className={`${styles.charCounter} ${newContent.length >= 100 ? styles.charCounterLimit : ""}`}>
              {newContent.length}/100
            </span>
          </div>

          {privacy !== undefined && (
            <div className={styles.privacySection}>
              <div className={styles.privacyHeader}>
                <span className={styles.privacyLabel}>Audience</span>
              </div>
              <div className={styles.privacyOptions}>
                {privacyOptions.map((option) => {
                  const Icon = option.icon;
                  const active = privacy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.privacyOption} ${active ? styles.privacyOptionActive : ""}`}
                      onClick={() => setPrivacy(option.value)}
                      aria-pressed={active}
                    >
                      <span className={styles.privacyIcon}>
                        <Icon size={16} />
                      </span>
                      <span className={styles.privacyText}>
                        <span className={styles.privacyTitle}>{option.label}</span>
                        <span className={styles.privacyDescription}>{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {privacy === "private" && followers && followers.length > 0 && (
            <div className={styles.followersSelection}>
              <p className={styles.followersTitle}>Choose followers</p>
              <div className={styles.followersList}>
                {followers.map(f => (
                  <label key={f.id} className={styles.followerItem}>
                    <input
                      className={styles.followerCheckbox}
                      type="checkbox" 
                      checked={viewerIds.includes(f.id)}
                      onChange={() => toggleViewer(f.id)}
                    />
                    <span className={styles.followerName}>{f.full_name || f.username}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {privacy === "private" && followers && followers.length === 0 && (
            <div className={styles.emptyFollowers}>
              You don't have any followers to select yet.
            </div>
          )}

          {/* Image upload */}
          <label className={styles.imageLabel} htmlFor="post-image-input">
            <Image size={16} />
            {imageFile ? imageFile.name : "Attach an image (optional)"}
          </label>
          <input
            id="post-image-input"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className={styles.imageInput}
          />

          {imageFile && (
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className={styles.preview}
            />
          )}

          <div className={styles.actions}>
            <button id="cancel-post-btn" type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button id="submit-post-btn" type="submit" className={styles.submitBtn}>
              Publish Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
