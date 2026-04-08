import { useState } from "react";
import styles from "./FollowRequest.module.css"; // import the CSS module
import { timeAgo } from "../../lib/time";

export default function FollowRequest({ request }) {

  console.log("Her It's In Notification i want to see it the data who is passing in parameter :", request.sender.id)
  const [status, setStatus] = useState(
    request.receiver_is_private === true ? "pending" : "accepted"
  );
  // << Her is alot of thing to be
  const handleFollowAction = async (senderId, action) => {
    try {
      console.log("her i hamdler")
      const res = await fetch(`http://localhost:8080/request_follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sender_id: senderId,
          status: action, // 
        }),
      });
  
      if (res.ok) {
        setStatus(action); //  
      } else {
        console.error("Failed to update follow request:", await res.text());
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };
  
  // Removed local timeAgo function; using imported helper

  return (
    <div className={styles.followRequest}>
      <div className={styles.info}>
        <img
          className={styles.avatar}
          src={request.sender.avatar || "/default-avatar.png"}
          alt={`${request.sender.first_name} ${request.sender.last_name}`}
        />
        <div className={styles.name}>
          <p>
            {request.sender.first_name} {request.sender.last_name}{" "}
          </p>
          <p className={styles.username}>@{request.sender.username}</p>
          {status === "pending"}
          {status === "accepted" && (
            <p className={`${styles.message} ${styles.accepted}`}>
              The user A it's starting following u 
            </p>
          )}
          {status === "rejected" && (
            <p className={`${styles.message} ${styles.rejected}`}>
              You rejected the request
            </p>
          )}
          
        </div>
      </div>
      <div></div>
      {status === "pending" && (
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.accept}`}
            onClick={() => handleFollowAction(request.sender.id,  "accept")}
            >
            Accept
          </button>
          <button
            className={`${styles.button} ${styles.reject}`}
            onClick={() =>  handleFollowAction(request.sender.id,  "reject")}
            >
            Reject
          </button>
        </div>
      )}
      {request.created_at && (
        <p className={styles.timestamp}>{timeAgo(request.created_at)}</p>
      )}
    </div>
  );
}
