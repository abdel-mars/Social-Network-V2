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
}) {
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
