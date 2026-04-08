"use client";

import { useState, useEffect } from "react";
import { LogIn } from "lucide-react";
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
        <p style={{ color: "white" }}>Checking session...</p>
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
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.formIcon}>
            <LogIn color="#963AFF" />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your 01Social account</p>
          <div className={styles.inputContainer}>
            <label htmlFor="username">Username or Email</label>
            <input
              id="username"
              className={styles.loginInput}
              name="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.loginInput}
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.loginSubmit} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className={styles.registerLink}>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
            >
              Create one
            </button>
          </p>
        </form>
      </main>
    );
  }

  return null;
}
