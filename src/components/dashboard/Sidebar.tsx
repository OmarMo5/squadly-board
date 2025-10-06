import { useEffect, useState } from "react";
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
import { Home, DollarSign, Calculator, Code, Palette, Layout, Shield, Users, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
}

const departments = [
  { id: "all", name: "All Departments", icon: Home },
  { id: "sales", name: "Sales", icon: DollarSign },
  { id: "accounting", name: "Accounting", icon: Calculator },
  { id: "tech", name: "Tech", icon: Code },
  { id: "graphics", name: "Graphics", icon: Palette },
  { id: "uiux", name: "UI/UX", icon: Layout },
];

const adminItems = [
  { id: "roles", name: "Roles", icon: Shield, path: "/admin/roles" },
  { id: "users", name: "Users", icon: Users, path: "/admin/users" },
  { id: "admin", name: "Admin Panel", icon: Settings, path: "/admin" },
];

export function Sidebar({ selectedDepartment, onDepartmentChange }: SidebarProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      }
    };

    checkAdminRole();
  }, []);

  return (
    <SidebarUI>
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">TaskFlow</h1>
        <SidebarTrigger />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Departments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {departments.map((dept) => (
                <SidebarMenuItem key={dept.id}>
                  <SidebarMenuButton
                    onClick={() => onDepartmentChange(dept.id)}
                    isActive={selectedDepartment === dept.id}
                  >
                    <dept.icon className="h-4 w-4" />
                    <span>{dept.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => window.location.href = item.path}
                      isActive={window.location.pathname === item.path}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </SidebarUI>
  );
}
