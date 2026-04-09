"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "./components/ui/Toast";
import styles from "./page.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [detect, setDetect] = useState(false);
  const [notification, setNotification] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get("username") || searchParams.get("email");
    if (prefill) {
      setUsername(prefill);
      setNotification({ message: "Account created! You can now login.", type: "success" });
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("http://localhost:8080/checkstate", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setDetect(true);
          router.push("/home");
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "Login successful!", type: "success" });
        localStorage.setItem("userId", data.user_id);
        setTimeout(() => {
          router.push("/home");
        }, 1000);
      } else {
        setNotification({ message: data.message || "Login failed", type: "error" });
      }
    } catch (err) {
      setNotification({ message: "Network error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  if (!detect) {
    return (
      <main className={styles.loginContainer}>
        {notification && (
          <Toast
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Floating tile card */}
        <div className={styles.loginCard}>
          {/* Logo */}
          <div className={styles.cardLogo}>
            <div className={styles.logoRing}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/>
                <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.35"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
            </div>
            <h1 className={styles.logoTitle}>01Social</h1>
          </div>

          <h2 className={styles.heading}>Welcome back!</h2>
          <p className={styles.subheading}>Sign in to your account</p>

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username or Email</label>
              <input
                id="username"
                className={styles.input}
                name="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                className={styles.input}
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className={styles.switchText}>
            Don't have an account?{" "}
            <button
              id="go-register-btn"
              type="button"
              className={styles.switchLink}
              onClick={() => router.push("/register")}
            >
              Create one
            </button>
          </p>
        </div>
      </main>
    );
  }

  return null;
}
