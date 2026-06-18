import * as React from "react"
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Users,
  Layers,
  Archive,
  ShieldCheck
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"
import { useAuth } from "../contexts/AuthContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Records",
      url: "/records",
      icon: Archive,
    },
    {
      title: "NAP Form 1",
      url: "/nap-form-1",
      icon: FileSpreadsheet,
    },
    ...(isAdmin ? [{
      title: "Admin Panel",
      url: "/admin",
      icon: Settings,
      items: [
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
        {
          title: "Approvals",
          url: "/admin/approvals",
          icon: ShieldCheck,
        }
      ]
    }] : [])
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
