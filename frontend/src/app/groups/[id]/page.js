"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Renderbar } from "../../components/bar/bar";
import { Renderformpost } from "../../components/createpost/Createpost";
import { RenderPosts } from "../../components/posts/post";
import GroupCard from "../../components/groupcard/groupcard";
import Link from "next/link";
import { PenSquare, Users, UserPlus, LogOut, Trash2, TriangleAlert, X, MessageSquare, Calendar, Settings, ChevronDown } from "lucide-react";
import styles from "./groupdetail.module.css";
import InviteFriendsModal from "../../components/inviteFriends/inviteFriends";
import Toast from "../../components/ui/Toast";
import { useNotifications } from "../../components/notifications/NotificationsContext";
import { EventsFeed } from "../../components/events/EventsFeed";
import { CreateEventModal } from "../../components/events/CreateEventModal";
import { API_URL } from "../../lib/api";
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
  const [visibleMembersCount, setVisibleMembersCount] = useState(5);
  const [showActions, setShowActions] = useState(false);

  const hydrateCommentCounts = async (postsToHydrate) => {
    const hydratedPosts = await Promise.all(
      (postsToHydrate || []).map(async (post) => {
        try {
          const postType = post.group_id ? "group_post" : "post";
          const res = await fetch(
            `${API_URL}/posts/${post.id}/comments?post_type=${postType}`,
            { credentials: "include" }
          );
          if (!res.ok) {
            return {
              ...post,
              comments_count: typeof post.comments_count === "number" ? post.comments_count : 0,
            };
          }
          const comments = await res.json();
          return {
            ...post,
            comments_count: Array.isArray(comments) ? comments.length : 0,
          };
        } catch (err) {
          return {
            ...post,
            comments_count: typeof post.comments_count === "number" ? post.comments_count : 0,
          };
        }
      })
    );

    return hydratedPosts;
  };

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
      const res = await fetch(`${API_URL}/Get_Group_By_ID?id=${id}&limit=10&offset=${currentOffset}`, {
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
      const hydratedPosts = await hydrateCommentCounts(data.posts || []);
      
      if (currentOffset === 0) {
        setIsMember(data.group.is_member);
        setPosts(hydratedPosts);
        setEvents(data.events || []);
        setInviteState(data.group.member_status);
        setGroup(data);
        setGroupe_id(data.group);
        setOffset(hydratedPosts.length || 0);
        setHasMore((hydratedPosts.length || 0) === 10);
      } else {
        setPosts((prev) => {
          const combined = [...prev, ...hydratedPosts];
          return Array.from(new Map(combined.map(p => [`${p.group_id ? "group" : "post"}_${p.id}`, p])).values());
        });
        setOffset(currentOffset + hydratedPosts.length);
        setHasMore(hydratedPosts.length === 10);
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

  const handleMembersScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      if (visibleMembersCount < (group?.members?.length || 0)) {
        setVisibleMembersCount((prev) => prev + 5);
      }
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: parseInt(id) }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update group state locally to reflect the new member status
        setGroup(prev => ({
          ...prev,
          group: {
            ...prev.group,
            member_status: data?.state === "member" ? "member" : "requested"
          }
        }));

        if (data?.state === "member") {
          const inviteNotificationIds = notifications
            .filter(
              (notification) =>
                notification.type === "group_invitation" && notification.group_id === parseInt(id)
            )
            .map((notification) => notification.id);

          if (inviteNotificationIds.length > 0) {
            await markNotificationsRead(inviteNotificationIds);
            removeNotifications(inviteNotificationIds);
          }
          redirectToGroupsWithToast("Welcome to the group!", "success");
        } else {
          setToast({ message: "Join request sent!", type: "success" });
        }
      }
    } catch (err) {
      console.error("Failed to join:", err);
      setToast({ message: "Failed to join group", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/group/leave`, {
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
      const res = await fetch(`${API_URL}/group/delete`, {
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
      const res = await fetch(`${API_URL}/Creat_Post_Groupe`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create group post");
      }

      const createdPost = await res.json();
      const hydratedCreatedPosts = await hydrateCommentCounts([createdPost]);
      setPosts((prev) => [...hydratedCreatedPosts, ...prev]);
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
      const res = await fetch(`${API_URL}/group-event/create`, {
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

  // Handle click outside to close actions menu
  useEffect(() => {
    if (!showActions) return;

    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.moreWrapper}`)) {
        setShowActions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showActions]);

  const handleInviteResponse = async (newState) => {
    setInviteLoading(true);
    try {
      const res = await fetch(`${API_URL}/group/invite/respond`, {
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
              <div className={styles.titleWrapper}>
                <h1 className={styles.groupTitle}>{g.title}</h1>
                <span className={styles.privacyTag}>{g.privacy}</span>
              </div>
              <div className={styles.groupSubhead}>
                <span className={styles.adminTag}>
                  Admin: <Link href={`/profile?id=${g.creator_id}`} className={styles.adminLink}>{g.admin.username}</Link>
                </span>
              </div>
              {g.description && <p className={styles.headerDescription}>{g.description}</p>}
            </div>
            <div className={styles.groupActions}>
              {!IsMember ? (
                <div className={styles.nonMemberJoin}>
                  {g.member_status === "requested" ? (
                    <button className={styles.joinBtn} disabled>Request Sent</button>
                  ) : g.member_status === "invited" ? (
                    <div className={styles.inviteActionsHeader}>
                      <button className={styles.acceptBtnSmall} disabled={inviteLoading} onClick={() => handleInviteResponse("accept")}>Accept</button>
                      <button className={styles.rejectBtnSmall} disabled={inviteLoading} onClick={() => handleInviteResponse("reject")}>Decline</button>
                    </div>
                  ) : (
                    <button className={styles.joinBtn} onClick={handleJoin}>Join Group</button>
                  )}
                </div>
              ) : (
                <div className={styles.moreWrapper}>
                  <button 
                    className={`${styles.manageBtn} ${showActions ? styles.manageBtnActive : ""}`} 
                    onClick={() => setShowActions(!showActions)}
                    title="Manage Group"
                  >
                    <Settings size={20} className={styles.settingsIcon} />
                  </button>
                  
                  <div className={`${styles.actionsMenu} ${showActions ? styles.actionsVisible : ""}`}>
                    <Link 
                      href={`/chat?group_id=${id}`} 
                      className={styles.menuItem}
                      onClick={() => setShowActions(false)}
                    >
                      <MessageSquare size={18} />
                      <span>Group Chat</span>
                    </Link>

                    <button 
                      className={styles.menuItem} 
                      onClick={() => {
                        setIsInviteModalOpen(true);
                        setShowActions(false);
                      }}
                    >
                      <UserPlus size={18} />
                      <span>Invite Friends</span>
                    </button>

                    <div className={styles.menuSeparator}></div>

                    {!isCreator ? (
                      <button 
                        className={`${styles.menuItem} ${styles.leaveItem}`} 
                        onClick={() => {
                          setConfirmAction("leave");
                          setShowActions(false);
                        }}
                      >
                        <LogOut size={18} />
                        <span>Leave Group</span>
                      </button>
                    ) : (
                      <button 
                        className={`${styles.menuItem} ${styles.deleteItem}`} 
                        onClick={() => {
                          setConfirmAction("delete");
                          setShowActions(false);
                        }}
                      >
                        <Trash2 size={18} />
                        <span>Delete Group</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!IsMember ? (
            <div className={styles.nonMemberAlert}>
              You must join this group to see its posts.
            </div>
          ) : (
            <>
              {/* Actions row - MOBILE ONLY */}
              <div className={styles.mobilePrompts}>
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

              <EventsFeed events={events} setEvents={setEvents} currentUserId={currentUserId} />

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

        {/* Side Column - Members & Desktop Prompts */}
        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <h2 className={styles.sideTitle}>
              <Users size={18} style={{ display: "inline", marginRight: "8px" }} />
              Members ({members?.length || 0})
            </h2>
            <div className={styles.membersList} onScroll={handleMembersScroll}>
              {members?.slice(0, visibleMembersCount).map((m) => (
                <div key={m.id} className={styles.memberItem}>
                  <div>
                    <div className={styles.memberName}>{m.first_name} {m.last_name}</div>
                    <div className={styles.memberUsername}>@{m.username}</div>
                  </div>
                  <div className={styles.memberStatus}>{m.status}</div>
                </div>
              ))}
              {members?.length === 0 && <p className={styles.emptyMembers}>No members yet.</p>}
            </div>
          </div>

          {IsMember && (
            <div className={styles.desktopPrompts}>
              <div className={styles.createPrompt} onClick={() => setIsModalOpen(true)}>
                <div className={styles.promptText}>Got something to share?</div>
                <button className={styles.promptBtn}>
                  <PenSquare size={15} />
                  Post
                </button>
              </div>
              <div className={styles.createPrompt} onClick={() => setIsEventModalOpen(true)}>
                <div className={styles.promptText}>Hosting an event?</div>
                <button className={styles.promptBtn}>
                  <Calendar size={15} />
                  Event
                </button>
              </div>
            </div>
          )}
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
