import style from "./logoutrender.module.css"

export function Logoutrender({ handleNavigate }) {
  console.log("Logoutrender component is rendering"); 
    const handleLogout = async () => {
      try {
        const res = await fetch("http://localhost:8080/logout", {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          localStorage.clear();
          handleNavigate("/");
        } else {
          const err = await res.text();
          alert("Logout failed: " + err);
        }
      } catch (err) {
        console.error("Logout error:", err);
      }
    };

    return (
      <button
      className={style.logoutButton}
        onClick={handleLogout}
      >
        Logout
      </button>
    );
    
  }
  