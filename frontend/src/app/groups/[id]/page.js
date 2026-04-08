"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import style from "../../page.module.css";
import  {Renderformpost} from "../../components/createpost/Createpost"
import { RenderPosts } from "../../components/posts/post";
import { PostModel } from "../../components/postpoup/postcontent";
import GroupCard from "../../components/groupcard/groupcard";

export default function GroupDetailsPage() {
  const { id } = useParams()
  const [group, setGroup] = useState(null)
  const [groupe_id, setGroupe_id] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [posts, setPosts] = useState([]);
  const [IsMember, setIsMember] = useState(false);
  //  her i will handle posts 
  //const [posts, setPosts] = useState([]);

  // fetch group
  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`http://localhost:8080/Get_Group_By_ID?id=${id}`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error("Failed to fetch group details")
        const data = await res.json()
        console.log("Fetched group details:", data)
        setIsMember(data.group.is_member);
        setGroup(data)
        setGroupe_id(data.group)
      } catch (err) {
        console.error(err)
      }
    }
    fetchGroup()
  }, [id])

  // <-> Handle_Post_Creation <>
  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    const formData = new FormData()
    formData.append("title", newTitle)
    formData.append("content", newContent)
    if (imageFile) {
      formData.append("image", imageFile)
    }
    // optional: attach group_id !!
    formData.append("group_id", id)
    try {
      const res = await fetch("http://localhost:8080/Createpost", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.text()
        alert("Error: " + err)
        return
      }
      const data = await res.json()
      console.log("New post created:", data)
      setPosts(Array(data))
      setNewTitle("")
      setNewContent("")
      setImageFile(null)
      setIsModalOpen(false)

    } catch (err) {
      console.error("Failed to create post:", err)
    }
  }

  if (!group) return <p className="p-6 text-gray-500">Loading group details...</p>

  const { group: g, members } = group

  return (

    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">{g.title}</h1>

      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Create Post
      </button>
      {isModalOpen && (
        <Renderformpost
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newContent={newContent}
          setNewContent={setNewContent}
          handleCreatePost={handleCreatePost}
          onClose={() => setIsModalOpen(false)}
          imageFile={imageFile}
          setImageFile={setImageFile}
        />
      )}
      <div className="mb-4 border-b pb-2">
        <p className="text-gray-700">
          <strong>Admin:</strong> {g.admin.username}
        </p>
        <p className="text-gray-700">
          <strong>Creator ID:</strong> {g.creator_id}
        </p>
        <p className="text-gray-700">
          <strong>Group ID:</strong> {g.id}
        </p>
      </div>
      <h2 className="mt-4 font-semibold text-lg text-gray-800">Members</h2>
      <ul className="mt-2 space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition"
          >
            <p className="font-medium text-gray-800">
              {m.first_name} {m.last_name}{" "}
              <span className="text-sm text-gray-500">(@{m.username})</span>
            </p>
            <p className="text-sm text-gray-600">Status: {m.status}</p>
          </li>
        ))}
      </ul>
       {/* <<-- Membership Checker --> */}
    {IsMember ? (
      <p className="mb-4 text-green-600 font-semibold">
        You are a member of this group 
      </p>
    ) : (
      <p className="mb-4 text-red-600 font-semibold">
        u cant see the content of this goupe please join ...
      </p>
    )}
    {!IsMember && <GroupCard key={group.group.id} group={groupe_id} Clickable={false}/>}   
      {/* <<--|-->> */}
        <section className={style.postsFeed}>
          {posts.map((post) => (
            <RenderPosts
              key={post.id}
              post={post}
              setPosts={setPosts}
            //handleReaction={handleReaction}
            />
          ))}
        </section>
    </div>
  )

}