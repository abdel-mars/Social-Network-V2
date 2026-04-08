import { useEffect, useState } from "react";
import { Logoutrender } from "../logoutbutton/logoutrender";
import FriendsList from "../friendlist/friendlist";
import { NotificationPanel } from "../notifications/notificationpanel"; // your component
import { useRouter } from "next/navigation";

import style from "./bar.module.css";

export function Renderbar() {
  const [userId, setUserId] = useState(null);
  const router = useRouter();
  const handleNavigate = (path) => {
    router.push(path);
  };  
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    setUserId(storedId);
  }, []);

  return (

    <aside className={style.leftSideBar}>
      <div className={style.cardTheme}>
        <img src="/01social.png" />
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li className={style.navItem} onClick={() => handleNavigate("/home")}>
            Home
          </li>
          <li
            className={style.navItem}
            onClick={() => handleNavigate(`/profile?id=${userId}`)}
          >
            Profile
          </li>
          <li className={style.navItem}>Chat</li>
          <li className={style.navItem} onClick={() => handleNavigate("/groups")}> Groups</li>
          <Logoutrender handleNavigate={handleNavigate} />
        </ul>
      </div>

      <div className={style.cardTheme}>
        <FriendsList />
      </div>

      {/* Render notifications inside sidebar */}
      <div className={style.cardTheme}>
        <NotificationPanel/>
      </div>
    </aside>
  );
}
