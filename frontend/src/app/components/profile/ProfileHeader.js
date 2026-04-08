"use client";

export function ProfileHeader({ user, followersCount, followingCount }) {
  return (
    <div style={{ textAlign: "center" }}>
      <h2>
        {user.first_name} {user.last_name}'s Profile
      </h2>
      {user.avatar && (
        <img
          src={`http://localhost:8080/${user.avatar}`}
          alt="avatar"
          style={{ width: 150, height: 150, borderRadius: "50%", marginBottom: 20 }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 20 }}>
        <div>
          <strong>Followers</strong>
          <p>{followersCount}</p>
        </div>
        <div>
          <strong>Following</strong>
          <p>{followingCount}</p>
        </div>
      </div>
    </div>
  );
}