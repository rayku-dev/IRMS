import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Layers,
  Archive,
  ShieldCheck
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { NavRecords } from "./nav-records"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "./ui/sidebar"
import { useAuth } from "../contexts/AuthContext"
import { useRecentActivity } from "../contexts/RecentActivityContext"

import { getAllSections, createSection, updateSection, deleteSection, type Section } from "../services/sectionService"
import AddSectionModal from "./modals/AddSectionModal"
import RenameSectionModal from "./modals/RenameSectionModal"
import DeleteSectionModal from "./modals/DeleteSectionModal"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { addActivity } = useRecentActivity()
  const navigate = useNavigate()
  const isAdmin = user?.role === "admin"

  const [sections, setSections] = useState<Section[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)

  const fetchSections = useCallback(async () => {
    try {
      const data = await getAllSections()
      setSections(data)
    } catch (err: any) {
      console.error('Error loading sections', err)
    }
  }, [])

  useEffect(() => {
    fetchSections()
    const handleUpdate = () => fetchSections()
    window.addEventListener('sections-updated', handleUpdate)
    return () => window.removeEventListener('sections-updated', handleUpdate)
  }, [fetchSections])

  const handleAddSection = async (sectionData: { name: string; description: string; icon: string; path: string; typeId: string; }) => {
    try {
      const newSection = {
        name: sectionData.name,
        description: sectionData.description || 'Custom section for organizing your records and folders.',
        typeId: sectionData.typeId,
        icon: sectionData.icon,
        active: true
      }
      const created = await createSection(newSection)
      toast.success('Section added')
      addActivity({
        action: 'Added section',
        description: `Section "${created.name}" was created`,
        type: 'add',
        user: user?.username
      })
      window.dispatchEvent(new Event('sections-updated'))
      if (created && (created.slug || created.id)) {
        navigate(`/folder/${created.slug || created.id}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding section')
    }
  }

  const handleRenameSection = async (sectionId: string, data: { name: string; description?: string; icon?: string; typeId?: string }) => {
    try {
      const result: any = await updateSection(sectionId, data)
      if (result?.pending) {
        toast.info(result.message)
      } else {
        toast.success('Section renamed')
        addActivity({
          action: 'Renamed section',
          description: `Section renamed to "${data.name || 'new name'}"`,
          type: 'edit',
          user: user?.username
        })
        window.dispatchEvent(new Event('sections-updated'))
      }
    } catch (err: any) {
      toast.error(err.message || 'Error renaming section')
      throw err
    }
  }

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return
    try {
      const result: any = await deleteSection(sectionToDelete.id)
      if (result?.pending) {
        toast.info(result.message)
      } else {
        toast.success('Section deleted')
        addActivity({
          action: 'Deleted section',
          description: `Section "${sectionToDelete.name}" was deleted`,
          type: 'delete',
          user: user?.username
        })
        window.dispatchEvent(new Event('sections-updated'))
      }
      setShowDeleteModal(false)
      setSectionToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Error deleting section')
      setShowDeleteModal(false)
    }
  }

  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "NAP Form 1",
      url: "/nap-form-1",
      icon: FileSpreadsheet,
    },
  ]

  const libraryItems = [
    {
      title: "User",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Section Type",
      url: "/admin/section-types",
      icon: Layers,
    },
  ]

  const adminItems = [
    {
      title: "Approvals",
      url: "/admin/approvals",
      icon: ShieldCheck,
    },
    {
      title: "Archive",
      url: "/admin/archive",
      icon: Archive,
    },
    {
      title: "Disposal",
      url: "/admin/disposal",
      icon: ShieldCheck,
    }
  ]

  return (
    <>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                    IR
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold">IRMS</span>
                    <span className="truncate text-xs">DepEd SDO Imus</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navMain} />
          
          <NavRecords 
            sections={sections} 
            isAdmin={isAdmin} 
            onAdd={() => setIsAddOpen(true)}
            onRename={(section) => {
              setSelectedSection(section)
              setIsRenameOpen(true)
            }}
            onDelete={(section) => {
              setSectionToDelete(section)
              setShowDeleteModal(true)
            }}
          />

          {isAdmin && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Library</SidebarGroupLabel>
                <SidebarMenu>
                  {libraryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      <AddSectionModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAddSection} />
      <RenameSectionModal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} onRename={handleRenameSection} section={selectedSection} />
      <DeleteSectionModal open={showDeleteModal} onCancel={() => { setShowDeleteModal(false); setSectionToDelete(null); }} onConfirm={handleConfirmDeleteSection} sectionName={sectionToDelete?.name} />
    </>
  )
}
