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
import { Home, DollarSign, Calculator, Code, Palette, Layout } from "lucide-react";

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

export function Sidebar({ selectedDepartment, onDepartmentChange }: SidebarProps) {
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
      </SidebarContent>
    </SidebarUI>
  );
}
