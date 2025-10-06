import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Plus, Edit, Trash2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { RolePermissionsDialog } from "@/components/admin/RolePermissionsDialog";
import { SidebarProvider } from "@/components/ui/sidebar";

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type RolePermission = {
  role: "admin" | "manager" | "employee";
  permissions: Permission[];
};

export default function RolesPermissions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<"admin" | "manager" | "employee" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all permissions
      const { data: permsData, error: permsError } = await supabase
        .from("permissions")
        .select("*")
        .order("category", { ascending: true });

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Fetch role permissions grouped by role
      const roles: ("admin" | "manager" | "employee")[] = ["admin", "manager", "employee"];
      const rolePermsData: RolePermission[] = [];

      for (const role of roles) {
        const { data, error } = await supabase
          .from("role_permissions")
          .select(`
            permission_id,
            permissions (
              id,
              name,
              description,
              category
            )
          `)
          .eq("role", role);

        if (error) throw error;

        const rolePerms: Permission[] = data
          .map((rp: any) => rp.permissions)
          .filter(Boolean);

        rolePermsData.push({ role, permissions: rolePerms });
      }

      setRolePermissions(rolePermsData);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: "admin" | "manager" | "employee") => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const handleSavePermissions = async (role: string, permissionIds: string[]) => {
    try {
      // Delete existing permissions for this role
      await supabase
        .from("role_permissions")
        .delete()
        .eq("role", role as "admin" | "manager" | "employee");

      // Insert new permissions
      const inserts = permissionIds.map((permId) => ({
        role: role as "admin" | "manager" | "employee",
        permission_id: permId,
      }));

      const { error } = await supabase
        .from("role_permissions")
        .insert(inserts);

      if (error) throw error;

      toast.success(`Permissions updated for ${role}`);
      fetchData();
      setDialogOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      toast.error("Failed to update permissions: " + error.message);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <div className="flex-1">
            <Header />
            <main className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Roles & Permissions
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage role permissions for your organization
            </p>
          </div>

          <div className="grid gap-6">
            {rolePermissions.map((roleData) => {
              const permsByCategory = roleData.permissions.reduce((acc, perm) => {
                if (!acc[perm.category]) acc[perm.category] = [];
                acc[perm.category].push(perm);
                return acc;
              }, {} as Record<string, Permission[]>);

              return (
                <Card key={roleData.role}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-2xl capitalize">
                          {roleData.role}
                        </CardTitle>
                        <Badge variant={getRoleBadgeVariant(roleData.role)}>
                          {roleData.permissions.length} permissions
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleEditRole(roleData.role)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Permissions
                      </Button>
                    </div>
                    <CardDescription>
                      {roleData.role === "admin" && "Full system access with all permissions"}
                      {roleData.role === "manager" && "Department and team management capabilities"}
                      {roleData.role === "employee" && "Basic task management permissions"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(permsByCategory).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="font-semibold capitalize mb-2 text-sm text-muted-foreground">
                            {category}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => (
                              <Badge key={perm.id} variant="outline">
                                {perm.description || perm.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>

      {selectedRole && (
        <RolePermissionsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          role={selectedRole}
          allPermissions={permissions}
          currentPermissions={
            rolePermissions.find((rp) => rp.role === selectedRole)?.permissions || []
          }
          onSave={handleSavePermissions}
        />
      )}
      </div>
    </SidebarProvider>
  );
}
