"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, User, MessageCircle, Users, LogOut,
  Bell, Menu, X, Sun, Moon
} from "lucide-react";
import { useTheme } from "../ui/ThemeContext";
import { useChat } from "../chat/ChatContext";
import AccentPicker from "../ui/AccentPicker";
import SearchBar from "./SearchBar";
import { NotificationPanel } from "../notifications/notificationpanel";
import { useNotifications } from "../notifications/NotificationsContext";
import style from "./bar.module.css";
import chatStyle from "../chat/chat.module.css";
import { API_URL, UPLOAD_URL } from "../../lib/api";

const NAV_ITEMS = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Chat", path: "/chat", icon: MessageCircle },
  { label: "Groups", path: "/groups", icon: Users },
];

export function Renderbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme() || { theme: "light", toggleTheme: () => { } };
  const { notificationCount = 0 } = useNotifications() || {};
  const { totalUnreadCount = 0 } = useChat() || {};

  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_URL}/checkstate`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUserId(data.user_id);
            setUserData({ avatar: data.avatar, gender: data.gender });
            localStorage.setItem("userId", data.user_id);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }
    checkAuth();
  }, []);

  // Close notif panel on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Handle logout sync across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If userId is cleared in another tab, redirect here too
      if (e.key === "userId" && !e.newValue) {
        router.push("/");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_) { }
    localStorage.removeItem("userId");
    router.push("/");
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      <header className={style.topbar}>
        <div className={style.topbarInner}>

          {/* Left section: Logo + Search */}
          <div className={style.leftSection}>
            <div className={style.logo} onClick={() => router.push("/home")}>
              <div className={style.logoIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
                  <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.35" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </div>
              <span className={style.logoText}>01Social</span>
            </div>
            <SearchBar />
          </div>

          {/* Center nav pill */}
          <div className={style.centerSection}>
            <nav className={style.navPill}>
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <button
                  key={path}
                  id={`nav-${label.toLowerCase()}`}
                  className={`${style.navBtn} ${isActive(path) ? style.navBtnActive : ""}`}
                  onClick={() => router.push(path)}
                  title={label}
                >
                  <div className={chatStyle.headerBadgeWrapper}>
                    <Icon size={18} strokeWidth={2.2} />
                    {label === "Chat" && pathname !== "/chat" && totalUnreadCount > 0 && (
                      <span className={chatStyle.headerBadge}>
                        {totalUnreadCount > 9 ? "+9" : totalUnreadCount}
                      </span>
                    )}
                  </div>
                  <span className={style.navLabel}>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Right controls */}
          <div className={style.rightControls}>
            {/* Theme toggle */}
            <button
              id="theme-toggle-btn"
              className={style.iconBtn}
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to dark" : "Switch to light"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Accent picker */}
            <AccentPicker />

            {/* Notification bell */}
            <div className={style.notifWrapper} ref={notifRef}>
              <button
                id="notif-bell-btn"
                className={style.iconBtn}
                onClick={() => setNotifOpen(!notifOpen)}
                title="Notifications"
              >
                <div className={style.notifBell}>
                  <Bell size={18} />
                  {notificationCount > 0 && (
                    <span className={style.notifBadge}>
                      {notificationCount > 9 ? "+9" : notificationCount}
                    </span>
                  )}
                </div>
              </button>
              {notifOpen && (
                <div className={style.notifDropdown}>
                  <NotificationPanel />
                </div>
              )}
            </div>

            {/* Profile avatar */}
            <button
              id="profile-nav-btn"
              className={style.avatarBtn}
              onClick={() => {
                const id = userId || localStorage.getItem("userId");
                if (id) router.push(`/profile?id=${id}`);
                else router.push("/");
              }}
              title="My Profile"
            >
              {userData?.avatar ? (
                <img
                  src={`${UPLOAD_URL}/${userData.avatar}`}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : userData?.gender?.toLowerCase() === "female" || userData?.gender?.toLowerCase() === "women" ? (
                <img src="/default-female-avatar.svg" alt="Avatar" style={{ width: '100%', height: '100%' }} />
              ) : (
                <img src="/default-male-avatar.svg" alt="Avatar" style={{ width: '100%', height: '100%' }} />
              )}
            </button>

            {/* Logout */}
            <button
              id="logout-btn"
              className={`${style.iconBtn} ${style.logoutBtn}`}
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile hamburger */}
            <button
              className={`${style.iconBtn} ${style.hamburger}`}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={style.mobileDrawer} onClick={() => setMobileOpen(false)}>
          <div className={style.mobileMenu} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "8px 0 12px 0" }}>
              <SearchBar onMobileNav={() => setMobileOpen(false)} />
            </div>
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                className={`${style.mobileNavBtn} ${isActive(path) ? style.mobileNavBtnActive : ""}`}
                onClick={() => { router.push(path); setMobileOpen(false); }}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
            <button
              className={style.mobileNavBtn}
              onClick={() => {
                const id = userId || localStorage.getItem("userId");
                if (id) router.push(`/profile?id=${id}`);
                else router.push("/");
                setMobileOpen(false);
              }}
            >
              {userData?.avatar ? (
                <img
                  src={`${UPLOAD_URL}/${userData.avatar}`}
                  alt="Avatar"
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : userData?.gender?.toLowerCase() === "female" || userData?.gender?.toLowerCase() === "women" ? (
                <img src="/default-female-avatar.svg" alt="Avatar" style={{ width: '20px', height: '20px' }} />
              ) : (
                <img src="/default-male-avatar.svg" alt="Avatar" style={{ width: '20px', height: '20px' }} />
              )}
              Profile
            </button>
            <button className={`${style.mobileNavBtn} ${style.mobileLogout}`} onClick={handleLogout}>
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
