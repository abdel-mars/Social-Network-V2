"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Renderbar } from "../../components/bar/bar";
import { Renderformpost } from "../../components/createpost/Createpost";
import { RenderPosts } from "../../components/posts/post";
import GroupCard from "../../components/groupcard/groupcard";
import Link from "next/link";
import { PenSquare, Users, UserPlus, LogOut, Trash2, TriangleAlert, X, MessageSquare, Calendar } from "lucide-react";
import styles from "./groupdetail.module.css";
import InviteFriendsModal from "../../components/inviteFriends/inviteFriends";
import Toast from "../../components/ui/Toast";
import { useNotifications } from "../../components/notifications/NotificationsContext";
import { EventsFeed } from "../../components/events/EventsFeed";
import { CreateEventModal } from "../../components/events/CreateEventModal";
// use global styles where handy if needed, but groupdetail.module.css is primary

export default function GroupDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { notifications, markNotificationsRead, removeNotifications } = useNotifications();
  const [group, setGroup] = useState(null);
  const [groupe_id, setGroupe_id] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [IsMember, setIsMember] = useState(false);
  const [inviteState, setInviteState] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const redirectToGroupsWithToast = (message, type = "success") => {
    window.sessionStorage.setItem("groupsToast", JSON.stringify({ message, type }));
    router.replace("/groups");
  };

  const fetchGroup = async ({ redirectIfMissing = false, currentOffset = 0 } = {}) => {
    if (loading || (!hasMore && currentOffset !== 0)) return;
    if (currentOffset !== 0) {
      setLoading(true);
      // Artificial delay to make scroll feel smoother
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      const res = await fetch(`http://localhost:8080/Get_Group_By_ID?id=${id}&limit=10&offset=${currentOffset}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (redirectIfMissing) {
          redirectToGroupsWithToast("This group was deleted by the admin.", "error");
          return;
        }
        throw new Error("Failed to fetch group details");
      }
      const data = await res.json();
      
      if (currentOffset === 0) {
        setIsMember(data.group.is_member);
        setPosts(data.posts || []);
        setEvents(data.events || []);
        setInviteState(data.group.member_status);
        setGroup(data);
        setGroupe_id(data.group);
        setOffset(data.posts?.length || 0);
        setHasMore((data.posts?.length || 0) === 10);
      } else {
        setPosts((prev) => {
          const combined = [...prev, ...(data.posts || [])];
          return Array.from(new Map(combined.map(p => [p.id, p])).values());
        });
        setOffset(currentOffset + (data.posts?.length || 0));
        setHasMore((data.posts?.length || 0) === 10);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load group details.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        if (hasMore && !loading && IsMember) {
          fetchGroup({ currentOffset: offset });
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset, hasMore, loading, IsMember]);

  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:8080/group/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: Number(id) }),
      });
      if (!res.ok) throw new Error("Failed to leave group");
      redirectToGroupsWithToast("You left the group successfully.", "success");
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to leave the group.", type: "error" });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteGroup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:8080/group/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: Number(id) }),
      });
      if (!res.ok) throw new Error("Failed to delete group");
      redirectToGroupsWithToast("Group deleted successfully.", "success");
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to delete the group.", type: "error" });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("content", newContent);
    formData.append("group_id", id);
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await fetch("http://localhost:8080/Creat_Post_Groupe", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create group post");
      }

      const createdPost = await res.json();
      setPosts((prev) => [createdPost, ...prev]);
      setNewTitle("");
      setNewContent("");
      setImageFile(null);
      setIsModalOpen(false);
      setToast({ message: "Post published to the group.", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to create the group post.", type: "error" });
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      const res = await fetch("http://localhost:8080/group-event/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          group_id: Number(id),
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.eventDate + ":00Z",
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      await fetchGroup();
      setIsEventModalOpen(false);
      setToast({ message: "Event created successfully.", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to create event.", type: "error" });
    }
  };

  useEffect(() => {
    const storedUserId = window.localStorage.getItem("userId");
    setCurrentUserId(storedUserId ? Number(storedUserId) : null);
    fetchGroup();
  }, [id]);

  useEffect(() => {
    if (!group) return;

    const intervalId = window.setInterval(() => {
      fetchGroup({ redirectIfMissing: true });
    }, 8000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchGroup({ redirectIfMissing: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [group, id]);

  const handleInviteResponse = async (newState) => {
    setInviteLoading(true);
    try {
      const res = await fetch("http://localhost:8080/group/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: Number(id), state: newState }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to respond to invitation");
      }
      const data = await res.json();
      setInviteState(data.state);
      if (data.state === "accept") {
        setIsMember(true);
      }
      const inviteNotificationIds = notifications
        .filter(
          (notification) =>
            notification.type === "group_invitation" && notification.group_id === Number(id)
        )
        .map((notification) => notification.id);

      if (inviteNotificationIds.length > 0) {
        await markNotificationsRead(inviteNotificationIds);
        removeNotifications(inviteNotificationIds);
      }
      await fetchGroup();
    } catch (err) {
      console.error(err);
    } finally {
      setInviteLoading(false);
    }
  };

  if (!group) {
    return (
      <div className={styles.pageRoot}>
        <Renderbar />
        <div className={styles.loading}>Loading group details...</div>
      </div>
    );
  }

  const { group: g, members } = group;
  const isCreator = g.creator_id === currentUserId;
  const confirmConfig = confirmAction === "delete"
    ? {
      title: "Delete this group?",
      description: "This will permanently remove the group, its posts, and access for every member.",
      confirmLabel: "Delete Group",
      icon: <Trash2 size={18} />,
      confirmClass: styles.confirmDanger,
    }
    : confirmAction === "leave"
      ? {
        title: "Leave this group?",
        description: "You will lose access to the group feed until you join again.",
        confirmLabel: "Leave Group",
        icon: <LogOut size={18} />,
        confirmClass: styles.confirmWarn,
      }
      : null;

  return (
    <div className={styles.pageRoot}>
      <Renderbar />

      <div className={styles.pageContent}>
        {/* Main Feed Column */}
        <div className={styles.mainCol}>
          <div className={styles.groupHeader}>
            <div className={styles.groupHeaderMeta}>
              <h1 className={styles.groupTitle}>{g.title}</h1>
              <div className={styles.groupSubhead}>
                <span className={styles.adminTag}>Admin: {g.admin.username}</span>
                <span className={styles.privacyTag}>{g.privacy}</span>
              </div>
            </div>
            <div className={styles.groupActions}>
              {IsMember && (
                <Link
                  href={`/chat?group_id=${id}`}
                  className={styles.chatBtn}
                >
                  <MessageSquare size={16} />
                  Group Chat
                </Link>
              )}
              {IsMember && (
                <button
                  className={styles.inviteFriendsBtn}
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserPlus size={16} />
                  Invite Friends
                </button>
              )}
              {IsMember && !isCreator && (
                <button className={styles.leaveBtn} onClick={() => setConfirmAction("leave")}>
                  <LogOut size={16} /> Leave Group
                </button>
              )}
              {isCreator && (
                <button className={styles.deleteBtn} onClick={() => setConfirmAction("delete")}>
                  <Trash2 size={16} />
                  Delete Group
                </button>
              )}
            </div>
          </div>

          {g.member_status === "invited" && !IsMember && (
            <div className={styles.invitePanel}>
              <p className={styles.inviteText}>
                You have been invited to join this group. Accept to become a member or decline to ignore the invitation.
              </p>
              <div className={styles.inviteActions}>
                <button className={styles.acceptBtn} disabled={inviteLoading} onClick={() => handleInviteResponse("accept")}>Accept</button>
                <button className={styles.rejectBtn} disabled={inviteLoading} onClick={() => handleInviteResponse("reject")}>Decline</button>
              </div>
            </div>
          )}
          {g.member_status === "requested" && !IsMember && (
            <div className={styles.requestedPanel}>
              <p className={styles.requestedText}>
                Your join request has been sent. The group owner will review it shortly.
              </p>
            </div>
          )}

          {!IsMember ? (
            <>
              <div className={styles.nonMemberAlert}>
                You must join this group to see its posts.
              </div>
              <GroupCard group={groupe_id} Clickable={false} />
            </>
          ) : (
            <>
              {/* Actions row */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }} className={styles.createPrompt} onClick={() => setIsModalOpen(true)}>
                  <div className={styles.promptText}>Got something to share?</div>
                  <button className={styles.promptBtn}>
                    <PenSquare size={15} />
                    Post
                  </button>
                </div>
                <div style={{ flex: 1 }} className={styles.createPrompt} onClick={() => setIsEventModalOpen(true)}>
                  <div className={styles.promptText}>Hosting an event?</div>
                  <button className={styles.promptBtn}>
                    <Calendar size={15} />
                    Event
                  </button>
                </div>
              </div>

              <EventsFeed events={events} setEvents={setEvents} />

              {/* Posts list */}
              <div className={styles.postsFeed}>
                {posts.length === 0 ? (
                  <p className={styles.loading}>No posts found.</p>
                ) : (
                  posts.map((post) => (
                    <RenderPosts
                      key={post.group_id ? `group_${post.id}` : `post_${post.id}`}
                      post={post}
                      setPosts={setPosts}
                    />
                  ))
                )}
              </div>
              {loading && <div className={styles.loading}>Loading more posts...</div>}
            </>
          )}
        </div>

        {/* Side Column - Members */}
        <div className={styles.sideCol}>
          <h2 className={styles.sideTitle}>
            <Users size={18} style={{ display: "inline", marginRight: "8px" }} />
            Members ({members?.length || 0})
          </h2>
          <div className={styles.membersList}>
            {members?.map((m) => (
              <div key={m.id} className={styles.memberItem}>
                <div>
                  <div className={styles.memberName}>{m.first_name} {m.last_name}</div>
                  <div className={styles.memberUsername}>@{m.username}</div>
                </div>
                <div className={styles.memberStatus}>{m.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      <CreateEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onCreate={handleCreateEvent}
      />

      {isInviteModalOpen && (
        <InviteFriendsModal
          groupId={id}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteSent={() => {
            setIsInviteModalOpen(false);
            setToast({ message: "Invitations sent successfully.", type: "success" });
          }}
        />
      )}

      {confirmConfig && (
        <div className={styles.confirmOverlay} onClick={() => !actionLoading && setConfirmAction(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.confirmClose}
              onClick={() => !actionLoading && setConfirmAction(null)}
              disabled={actionLoading}
            >
              <X size={18} />
            </button>
            <div className={styles.confirmIcon}>
              {confirmConfig.icon || <TriangleAlert size={18} />}
            </div>
            <h3 className={styles.confirmTitle}>{confirmConfig.title}</h3>
            <p className={styles.confirmText}>{confirmConfig.description}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmSecondary}
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`${styles.confirmPrimary} ${confirmConfig.confirmClass}`}
                onClick={confirmAction === "delete" ? handleDeleteGroup : handleLeaveGroup}
                disabled={actionLoading}
              >
                {actionLoading ? "Please wait..." : confirmConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
