import * as React from "react"
import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  Edit,
  Archive,
  Database,
  Warehouse,
  FileText,
  Building2,
  type LucideIcon,
  Plus
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar"
import { type Section } from "../services/sectionService"
import { Link } from "react-router-dom"
import { Button } from "./ui/button"

export function NavRecords({
  sections,
  isAdmin,
  onRename,
  onDelete,
  onAdd
}: {
  sections: Section[]
  isAdmin: boolean
  onRename: (section: Section) => void
  onDelete: (section: Section) => void
  onAdd: () => void
}) {
  const { isMobile } = useSidebar()

  const getIcon = (iconName: string): LucideIcon => {
    const map: Record<string, LucideIcon> = {
      Archive,
      Database,
      Warehouse,
      FileText,
      Building2
    }
    return map[iconName] || Archive
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between">
        Records
        {isAdmin && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.preventDefault(); onAdd(); }}>
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </SidebarGroupLabel>
      <SidebarMenu>
        {sections.map((section) => {
          const Icon = getIcon(section.icon)
          return (
            <SidebarMenuItem key={section.id}>
              <SidebarMenuButton asChild tooltip={section.name}>
                <Link to={`/folder/${section.slug || section.id}`}>
                  <Icon />
                  <span>{section.name}</span>
                </Link>
              </SidebarMenuButton>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem onClick={() => onRename(section)}>
                      <Edit className="text-muted-foreground mr-2 h-4 w-4" />
                      <span>Rename Section</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(section)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete Section</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
