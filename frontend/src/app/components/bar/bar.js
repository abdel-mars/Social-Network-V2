"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, User, MessageCircle, Users, LogOut,
  Bell, Menu, X, Sun, Moon
} from "lucide-react";
import { useTheme } from "../ui/ThemeContext";
import AccentPicker from "../ui/AccentPicker";
import { NotificationPanel } from "../notifications/notificationpanel";
import style from "./bar.module.css";

const NAV_ITEMS = [
  { label: "Home",    path: "/home",   icon: Home },
  { label: "Chat",    path: "/chat",   icon: MessageCircle },
  { label: "Groups",  path: "/groups", icon: Users },
];

export function Renderbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const [userId, setUserId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setUserId(id);
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

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {}
    localStorage.removeItem("userId");
    router.push("/");
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      <header className={style.topbar}>
        <div className={style.topbarInner}>

          {/* Logo */}
          <div className={style.logo} onClick={() => router.push("/home")}>
            <div className={style.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/>
                <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.35"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
            </div>
            <span className={style.logoText}>01Social</span>
          </div>

          {/* Center nav pill */}
          <nav className={style.navPill}>
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                className={`${style.navBtn} ${isActive(path) ? style.navBtnActive : ""}`}
                onClick={() => router.push(path)}
                title={label}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span className={style.navLabel}>{label}</span>
              </button>
            ))}
          </nav>

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
                <Bell size={18} />
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
              onClick={() => router.push(`/profile?id=${userId}`)}
              title="My Profile"
            >
              <User size={16} />
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
              onClick={() => { router.push(`/profile?id=${userId}`); setMobileOpen(false); }}
            >
              <User size={20} />
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
