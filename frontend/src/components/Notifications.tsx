import { useState } from "react"
import { Bell, Info, ChevronDown, ChevronRight, Hash as HashIcon, Tag as TagIcon, FileText as FileIcon } from "lucide-react"
import { Button } from "./ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { cn } from "../lib/utils"

// Mocked data to match the Less Paper System design
const mockNotifications = [
  {
    id: "1",
    type: "document_routed",
    message: "routed a document to your section",
    sender: "JANE DOE",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isRead: false,
    documentDetails: [
      { id: "d1", docType: "Memorandum", lpsNo: "LPS-2026-001", title: "Monthly Report" }
    ]
  },
  {
    id: "2",
    type: "system",
    message: "System maintenance scheduled for tonight.",
    sender: "SYSTEM",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: true,
  }
]

export function Notifications() {
  const [openNotifications, setOpenNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(mockNotifications.filter(n => !n.isRead).length)
  const [notifications, setNotifications] = useState(mockNotifications)
  const [expandedNotifications, setExpandedNotifications] = useState<Record<string, boolean>>({})

  const handleNotificationClick = () => {
    setOpenNotifications(!openNotifications)
    setUnreadCount(0) // mark all as seen
  }

  const handleNotificationClose = () => {
    setOpenNotifications(false)
  }

  const toggleExpandNotification = (notifId: string) => {
    setExpandedNotifications(prev => ({
      ...prev,
      [notifId]: !prev[notifId]
    }))
  }

  const markAsRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const formatDistanceToNow = (dateString: string) => {
    const date = new Date(dateString)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="relative z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationClick}
              className="relative text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Notifications</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Notifications Dropdown Popup */}
      {openNotifications && (
        <>
          {/* Backdrop covering layout to intercept close triggers */}
          <div className="fixed inset-0 z-[199] bg-transparent" onClick={handleNotificationClose} />
          <div className="fixed top-16 right-4 z-[200] w-[460px] bg-white dark:bg-card rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-200 dark:border-border overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-sm leading-tight">Notifications</h4>
                <span className="text-[9px] opacity-70 font-semibold uppercase tracking-wider block mt-0.5">Real-time alerts</span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    clearNotifications()
                    handleNotificationClose()
                  }}
                  className="cursor-pointer text-[10px] font-black tracking-wider bg-black/20 hover:bg-black/30 px-3 py-1 rounded transition-colors"
                >
                  CLEAR ALL
                </button>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-border">
              {notifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Info className="size-10 opacity-30" />
                  <span className="text-xs font-bold">No pending notifications.</span>
                </div>
              ) : (
                notifications.map(notif => {
                  const isDocNotif = notif.documentDetails && notif.documentDetails.length > 0
                  const isExpanded = !!expandedNotifications[notif.id]

                  return (
                    <div 
                      key={notif.id} 
                      className={cn("p-4 transition-colors", notif.isRead ? "bg-transparent" : "bg-primary/5")}
                    >
                      <div 
                        onClick={() => {
                          if (!notif.isRead) markAsRead(notif.id)
                          if (isDocNotif) {
                            toggleExpandNotification(notif.id)
                          }
                        }}
                        className={cn("flex items-start gap-2 cursor-pointer", isDocNotif && "hover:opacity-90")}
                      >
                        {/* Unread dot */}
                        <span className={cn(
                          "mt-1.5 shrink-0 size-1.5 rounded-full",
                          notif.isRead ? "bg-transparent" : "bg-primary"
                        )} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground leading-normal block">
                            {notif.message}
                          </span>
                          <div className="flex justify-between items-center mt-1.5 shrink-0">
                            <span className="text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider block">
                              {notif.sender}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-medium block">
                              {formatDistanceToNow(notif.createdAt)}
                            </span>
                          </div>
                        </div>
                        {isDocNotif && (
                          <span className="shrink-0 mt-0.5 text-muted-foreground">
                            {isExpanded
                              ? <ChevronDown className="size-3.5" />
                              : <ChevronRight className="size-3.5" />}
                          </span>
                        )}
                      </div>

                      {isDocNotif && isExpanded && (
                        <div className="mt-3 flex flex-col gap-2 pl-3 border-l-2 border-border animate-in fade-in duration-200">
                          {notif.documentDetails?.map(doc => (
                            <div
                              key={doc.id}
                              className="p-3 bg-muted/50 hover:bg-muted border border-border rounded-xl cursor-pointer transition-all duration-200"
                            >
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-bold mb-1">
                                <div className="flex items-center gap-1.5">
                                  <FileIcon size={12} className="text-primary" />
                                  <span className="truncate">{doc.docType}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <HashIcon size={12} className="text-primary" />
                                  <span className="truncate">{doc.lpsNo}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <TagIcon size={12} className="text-primary shrink-0" />
                                <span className="text-xs font-extrabold text-foreground truncate block">{doc.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
