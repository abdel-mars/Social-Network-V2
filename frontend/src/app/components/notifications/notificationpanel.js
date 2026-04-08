import { useEffect, useState } from "react";
import FollowRequest from "../followNotification/followNotification";
import JoinRequest from "../joinNotificaion/joinNotification";

export function NotificationPanel() {
  console.log("The ultimate of the power it's her in this NOtification ");


  // Her notfication useEffect !! >
  const [notifications, setNotifications] = useState([]);
   const [ws, setWs] = useState(null);
  // <<<<===========>>>> !!!
  let socket;
  // HER ill Open socket tunel with back-end for
  useEffect(() => {
    socket = new WebSocket("ws://localhost:8080/ws");
    setWs(socket);
    socket.onopen = () => console.log(" WebSocket connected");
    socket.onmessage = (e) => {
      let notif = JSON.parse(e.data);
      console.log("The notification who is come ", notif)
      // <<====>>..!
      if (!Array.isArray(notif)) {
        notif = [notif];
      }
      setNotifications((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        // <<=====>>> !!!
        const newNotifs = notif.filter(
          (n) => !current.some((c) => c.id === n.id)
        );
        return [...newNotifs, ...current];
      });
    };

    socket.onclose = () => console.log(" WebSocket closed");
    socket.onerror = (err) => console.error("⚠️ WebSocket error:", err);
    // For Testing The Socket With Back-End !
    window.ws = socket;
    // <=====================================>
  }, []);

  // hhhhhhhhhhhh 
  useEffect(() => {
    console.log("Sending request to backend /notifications ...");

    fetch("http://localhost:8080/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => {
        console.log("Response Notification Status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("Notifications received:", data);
        if (!Array.isArray(data)) {
          console.warn("⚠️ Expected array, got:", data);
          setNotifications([]);
        } else {
          setNotifications(data);
        }
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  return (
    <div>
      <h3>Notifications</h3>
      <ul>

        {notifications && notifications.length > 0 ? (
          notifications.map((n) => {
            console.log("Her is the object who i get from the notificatio")
            console.log(typeof (n))
            console.log("FollowRequest data:", n)
            console.log("Ther data indside them", n.type)
            if (n.type === "Invitation_friendships") {
              console.log("Im at invitaion shape ")
              return <FollowRequest key={n.id} request={n} />;
            }
            if (n.type === "request_join_groub") {
              console.log("Im At The Notificaion Of The Request")
              return <JoinRequest key={n.id} request={n} />
            }
            return (
              <li key={n.id}>
                <strong>{n.type}</strong> — {n.message} <br />
                From: {n.sender.username} ({n.sender.first_name}{" "}
                {n.sender.last_name})
              </li>
            );
          })
        ) : (
          <li>No notifications</li>
        )}
      </ul>
    </div>
  );
}
