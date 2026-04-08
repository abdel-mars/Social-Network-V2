"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./groupcard.module.css"

export default function GroupCard({ group, Clickable = true }) {

  const router = useRouter()
  console.log("Group Data In Card Component:", group)

  const handleCardClick = () => {
    router.push(`/groups/${group.id}`)
  }

  const [joined, setJoined] = useState(group.joined || false)

  const handleJoin = async () => {
    console.log("It's joing clicked 1")
    try {
      const res = await fetch(`http://localhost:8080/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: group.id }),
      })
      if (res.ok) {
        setJoined(true)
      }
    } catch (err) {
      console.error("Failed to join:", err)
    }
  }

  return (

    <div
      onClick={Clickable ? handleCardClick : undefined}
      className={styles.groupCard}
    >

      <div>
        <div>
          <div>
            <h2>{group.name}</h2>
            <p>{group.description}</p>
            <p>
              Privacy: <span>{group.privacy}</span>
            </p>
          </div>

          <div>
            {joined ? (
              <button>
                Joined
              </button>
            ) : (
              <button
                onClick={handleJoin}
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}