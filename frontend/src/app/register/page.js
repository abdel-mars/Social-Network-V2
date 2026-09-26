"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "../components/ui/Toast";
import style from "./register.module.css";
import { API_URL } from "../lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmpassword: "",
    gender: "",
    date_of_birth: "",
    nickname: "",
    about: "",
  });

  const [avatar, setAvatar] = useState(null);
  const router = useRouter();
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (let key in form) formData.append(key, form[key]);
    if (avatar) formData.append("avatar", avatar);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ message: "Registration successful! Redirecting...", type: "success" });
        setTimeout(() => {
          router.push(`/?username=${form.username}&email=${form.email}`);
        }, 1500);
      } else {
        setNotification({ message: data.message || "Registration failed", type: "error" });
      }
    } catch (err) {
      setNotification({ message: "Connecting error", type: "error" });
    }
  };

  return (
    <main className={style.registerContainer}>
      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className={style.registerCard}>
        <div className={style.cardHeader}>
          <div className={style.logoRing}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
              <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.35" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <h1 className={style.logoTitle}>01Social</h1>
          <h2 className={style.heading}>Create your account</h2>
          <p className={style.subheading}>Join and start connecting</p>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data" className={style.form}>

          {/* Name row */}
          <div className={style.row}>
            <div className={style.field}>
              <label htmlFor="first_name" className={style.label}>First Name</label>
              <input id="first_name" className={style.input} type="text" name="first_name"
                placeholder="First Name" onChange={handleChange} required />
            </div>
            <div className={style.field}>
              <label htmlFor="last_name" className={style.label}>Last Name</label>
              <input id="last_name" className={style.input} type="text" name="last_name"
                placeholder="Last Name" onChange={handleChange} required />
            </div>
          </div>

          {/* Username + Gender */}
          <div className={style.row}>
            <div className={style.field}>
              <label htmlFor="username" className={style.label}>Username</label>
              <input id="username" className={style.input} type="text" name="username"
                placeholder="username" onChange={handleChange} required />
            </div>
            <div className={style.field}>
              <label className={style.label}>Gender</label>
              <div className={style.genderToggle}>
                <button
                  type="button"
                  className={`${style.genderBtn} ${form.gender === "Male" ? style.genderBtnActive : ""}`}
                  onClick={() => setForm({ ...form, gender: "Male" })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="10" cy="14" r="5" />
                    <path d="M14 10l5-5M15 5h4v4" />
                  </svg>
                  Male
                </button>
                <button
                  type="button"
                  className={`${style.genderBtn} ${form.gender === "Female" ? style.genderBtnActive : ""}`}
                  onClick={() => setForm({ ...form, gender: "Female" })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="9" r="6" />
                    <path d="M12 15v7M9 19h6" />
                  </svg>
                  Female
                </button>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className={style.field}>
            <label htmlFor="email" className={style.label}>Email</label>
            <input id="email" className={style.input} type="email" name="email"
              placeholder="you@example.com" onChange={handleChange} required />
          </div>

          {/* Password row */}
          <div className={style.row}>
            <div className={style.field}>
              <label htmlFor="password" className={style.label}>Password</label>
              <input id="password" className={style.input} type="password" name="password"
                placeholder="••••••••" onChange={handleChange} required />
            </div>
            <div className={style.field}>
              <label htmlFor="confirmpassword" className={style.label}>Confirm Password</label>
              <input id="confirmpassword" className={style.input} type="password" name="confirmpassword"
                placeholder="••••••••" onChange={handleChange} required />
            </div>
          </div>

          {/* Nickname + Date of Birth */}
          <div className={style.row}>
            <div className={style.field}>
              <label htmlFor="nickname" className={style.label}>Nickname <span className={style.optional}>(optional)</span></label>
              <input id="nickname" className={style.input} type="text" name="nickname"
                placeholder="Nickname" onChange={handleChange} />
            </div>
            <div className={style.field}>
              <label htmlFor="date_of_birth" className={style.label}>Date of Birth</label>
              <input 
                id="date_of_birth" 
                className={style.input} 
                type="date" 
                name="date_of_birth"
                max={new Date().toISOString().split("T")[0]}
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          {/* About */}
          <div className={style.field}>
            <label htmlFor="about" className={style.label}>About Me <span className={style.optional}>(optional)</span></label>
            <textarea id="about" className={style.textarea} name="about"
              placeholder="Tell us something about yourself..." onChange={handleChange} />
          </div>

          {/* Avatar */}
          <div className={style.field}>
            <label htmlFor="avatar" className={style.fileLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {avatar ? avatar.name : "Upload Avatar (optional)"}
            </label>
            <input
              id="avatar" type="file" name="avatar" accept="image/*"
              onChange={(e) => setAvatar(e.target.files[0])}
              className={style.fileInput}
            />
          </div>

          <button id="register-submit-btn" type="submit" className={style.submitBtn}>
            Create Account
          </button>
        </form>

        <p className={style.switchText}>
          Already have an account?{" "}
          <button
            id="go-login-btn"
            type="button"
            className={style.switchLink}
            onClick={() => router.push("/")}
          >
            Sign In
          </button>
        </p>
      </div>
    </main>
  );
}
