"use client";

import { X, Image } from "lucide-react";
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
          <input
            type="text"
            id="post-title-input"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={styles.input}
            required
          />

          <textarea
            id="post-content-input"
            placeholder="What's on your mind?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className={styles.textarea}
            required
          />

          {privacy !== undefined && (
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className={styles.input}
              style={{ padding: "8px", marginTop: "10px", appearance: "auto" }}
            >
              <option value="public">🌍 Public (Everyone)</option>
              <option value="almost_private">👥 Almost Private (Followers Only)</option>
              <option value="private">🔒 Private (Specific Followers)</option>
            </select>
          )}

          {privacy === "private" && followers && followers.length > 0 && (
            <div className={styles.followersSelection}>
              <p style={{ fontSize: "14px", fontWeight: "bold", margin: "10px 0 5px 0" }}>
                Select who can see this:
              </p>
              <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px" }}>
                {followers.map(f => (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={viewerIds.includes(f.id)}
                      onChange={() => toggleViewer(f.id)}
                    />
                    {f.full_name || f.username}
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
