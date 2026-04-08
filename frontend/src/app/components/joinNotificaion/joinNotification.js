"use client"

import { useState } from "react"

export default function JoinRequest({ request }) {
  const [status, setStatus] = useState(request.state) // <<====>> \\ !!

  const handlestate = async (newStatus) => {
    console.log("Triggered status:", newStatus)
    try {
      const res = await fetch(`http://localhost:8080/accept-reject-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          group_id: request.group_id,
          user_id: request.sender.id,
          state: newStatus,
        }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      const r = await res.json()
      console.log("Response from backend:", r)
      setStatus(r.state) 
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="border p-3 rounded-lg flex justify-between items-center mb-2">
      <p>
        <strong>{request.sender.first_name}</strong> wants to join <strong>{request.group_title}</strong>
      </p>
      
      {}
      {status === "unread" ? (
        <div className="flex gap-2">
          <button
            className="bg-green-500 text-white px-3 py-1 rounded"
            onClick={() => handlestate("accept")}
          >
            Accept
          </button>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded"
            onClick={() => handlestate("reject")}
          >
            Reject
          </button>
        </div>
      ) : (
        <span className={`px-3 py-1 rounded ${
          status === "accept" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          Request {status}
        </span>
      )}
    </div>
  )
}

