"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import Toast from "../components/ui/Toast";
import style from "./register.module.css";


export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmpassword: "",
    gender: "",
    age: "",
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
      const res = await fetch("http://localhost:8080/register", {
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

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className={`card ${style.registerForm}`}
      >
        <div className={style.formIcon}>
          <UserPlus color="#963AFF" />
        </div>
        <h2>Welcome!</h2>
        <p>Create your 01Social account</p>

        {/* First Name / Last Name */}
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              className={style.registerInput}
              type="text"
              name="first_name"
              placeholder="First Name"
              onChange={handleChange}
            />
          </div>
          <div className={style.inputContainer}>
            <label htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              className={style.registerInput}
              type="text"
              name="last_name"
              placeholder="Last Name"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className={style.registerInput}
              type="text"
              name="username"
              placeholder="Username"
              onChange={handleChange}
            />
          </div>
          <div className={style.inputContainer}>
            <label htmlFor="gender">Gender</label>
            <input
              id="gender"
              className={style.registerInput}
              type="text"
              name="gender"
              placeholder="Gender"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className={style.registerInput}
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className={style.registerInput}
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
            />
          </div>
          <div className={style.inputContainer}>
            <label htmlFor="confirmpassword">Confirm Password</label>
            <input
              id="confirmpassword"
              className={style.registerInput}
              type="password"
              name="confirmpassword"
              placeholder="Confirm Password"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="nickname">Nickname (optional)</label>
            <input
              id="nickname"
              className={style.registerInput}
              type="text"
              name="nickname"
              placeholder="Nickname"
              onChange={handleChange}
            />
          </div>
          <div className={style.inputContainer}>
            <label htmlFor="age">Age</label>
            <input
              id="age"
              className={style.registerInput}
              type="number"
              name="age"
              placeholder="Age"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="about">About Me (optional)</label>
            <textarea
              id="about"
              className={style.registerAbout}
              name="about"
              placeholder="Tell us about yourself..."
              onChange={handleChange}
            ></textarea>
          </div>
        </div>
        <div className={style.formRow}>
          <div className={style.inputContainer}>
            <label htmlFor="avatar" className={style.fileLabel}>
              {avatar ? avatar.name : "Choose Avatar (optional)"}
            </label>
            <input
              id="avatar"
              type="file"
              name="avatar"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files[0])}
              className={style.fileInput}
            />
          </div>
        </div>

        <button type="submit" className={style.registerSubmit}>
          Register
        </button>
      </form>
    </main>
  );
}
