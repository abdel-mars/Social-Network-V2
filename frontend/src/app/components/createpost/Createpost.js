"use client"

export function Renderformpost({
    newTitle,
    setNewTitle,
    newContent,
    setNewContent,
    handleCreatePost,
    onClose,
    imageFile,
    setImageFile
  }) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", width: "400px" }}>
          <h2>Create Post</h2>
          <form onSubmit={handleCreatePost}>
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
  
            <textarea
              placeholder="What's on your mind?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
  
            {/*IMAGE*/}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
  
            {/**/}
            {imageFile && (
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Preview"
                style={{ width: "100%", borderRadius: "8px", marginBottom: "10px" }}
              />
            )}
  
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="submit" style={{ padding: "10px 20px" }}>
                Post
              </button>
              <button
                type="button"
                style={{ padding: "10px 20px", background: "#ccc" }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
