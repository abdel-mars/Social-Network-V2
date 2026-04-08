"use client";

import { useState, useEffect } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [detect, setDectec] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("http://localhost:8080/checkstate", {
          method: "GET",
          credentials: "include",
        });
        console.log("The checker it's call !!");
        console.log(res);
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setDectec(true);
          router.push("/home"); // already logged in → go home
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
        credentials: "include", // <<====>>
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Login success:", data);
        console.log(data);
        localStorage.setItem("userId", data.user_id);
        router.push("/home");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <p
        style={{
          textAlign: "center",
          marginTop: "100px",
          color: "var(--outer-space)",
        }}
      >
        Checking session...
      </p>
    );
  if (!detect) {
    return (
      <main className={`login ${styles.loginContainer}`}>
        <form onSubmit={handleLogin} className={`card ${styles.loginForm}`}>
          <div className={styles.formIcon}>
            <LogIn color="#963AFF"/>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your 01Social account</p>
          <div className={styles.inputContainer}>
            <label htmlFor="username">username or email</label>
            <input
              className={styles.loginInput}
              name="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className={styles.inputContainer}>
            <label htmlFor="password">password</label>
            <input
              className={styles.loginInput}
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.loginSubmit}>
            Login
          </button>
          <p
            style={{
              textAlign: "center",
              color: "var(--paynes-gray)",
              fontSize: "14px",
            }}
          >
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              style={{
                color: "var(--blue-munsell)",
                border: "none",
                background: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
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
