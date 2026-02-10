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
} from "@/components/ui/sidebar";
import { Home, DollarSign, Calculator, Code, Palette, Layout, Shield, Users, Settings, ListTodo, BarChart3, FileText, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  selectedDepartment?: string;
  onDepartmentChange?: (department: string) => void;
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

export function Sidebar({ selectedDepartment = "all", onDepartmentChange = () => {} }: SidebarProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">TaskFlow</h1>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  isActive={location.pathname === "/dashboard"}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/tasks")}
                  isActive={location.pathname === "/tasks"}
                >
                  <ListTodo className="h-4 w-4" />
                  <span>Tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/notifications")}
                  isActive={location.pathname === "/notifications"}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Notifications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/my-files")}
                    isActive={location.pathname === "/my-files"}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>My Files</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

          <SidebarGroup>
          <SidebarGroupLabel>User</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/profile")}
                  isActive={location.pathname === "/profile"}
                >
                  <Users className="h-4 w-4" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Departments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {departments.map((dept) => (
                <SidebarMenuItem key={dept.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      navigate(`/tasks?department=${dept.id}`);
                      onDepartmentChange(dept.id);
                    }}
                    isActive={selectedDepartment === dept.id && location.pathname === "/tasks"}
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
          <>
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
            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate("/files")}
                      isActive={location.pathname === "/files"}
                    >
                      <ListTodo className="h-4 w-4" />
                      <span>File Manager</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate("/admin/departments")}
                      isActive={location.pathname === "/admin/departments"}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Departments</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </SidebarUI>
  );
}
