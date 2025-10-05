import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Shield, Users, LayoutDashboard } from "lucide-react";

const adminMenuItems = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "roles", name: "Roles & Permissions", icon: Shield, path: "/admin/roles" },
  { id: "users", name: "Users Management", icon: Users, path: "/admin/users" },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarUI>
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">Admin Panel</h1>
        <SidebarTrigger />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
}
