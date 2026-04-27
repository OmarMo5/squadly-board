import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Search, Trash2, UserPlus, Edit } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { format } from "date-fns";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Admin = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  created_at: string;
};

export default function AdminManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  // Create dialog state
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit dialog state
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchAdmins();
  }, []);

  useEffect(() => {
    filterAdmins();
  }, [searchQuery, admins]);

  useEffect(() => {
    if (editingAdmin) {
      setEditFullName(editingAdmin.full_name);
      setEditEmail(editingAdmin.email);
      setEditDepartment(editingAdmin.department || "");
    }
  }, [editingAdmin]);

  const checkAdminAccess = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

  const fetchAdmins = async () => {
    try {
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminIds = adminRoles?.map((r) => r.user_id) || [];

      if (adminIds.length === 0) {
        setAdmins([]);
        setFilteredAdmins([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", adminIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      setAdmins(profilesData || []);
      setFilteredAdmins(profilesData || []);
    } catch (error: any) {
      toast.error("Failed to load admins: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAdmins = () => {
    if (!searchQuery) {
      setFilteredAdmins(admins);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = admins.filter(
      (admin) =>
        admin.full_name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query)
    );
    setFilteredAdmins(filtered);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      // Sign up new admin
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: createEmail,
          password: createPassword,
          options: {
            data: {
              full_name: createFullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        }
      );

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user");

      // Update profile with department
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          department: (createDepartment || null) as any,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "admin",
        });

      if (roleError) throw roleError;

      toast.success("Admin created successfully");
      setCreateDialogOpen(false);
      setCreateFullName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateDepartment("");
      fetchAdmins();
    } catch (error: any) {
      toast.error("Failed to create admin: " + error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditLoading(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName,
          email: editEmail,
          department: (editDepartment || null) as any,
        })
        .eq("id", editingAdmin.id);

      if (profileError) throw profileError;

      toast.success("Admin updated successfully");
      setEditingAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      toast.error("Failed to update admin: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete admin ${adminName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", adminId);

      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", adminId);

      if (roleError || profileError) throw roleError || profileError;

      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
      setFilteredAdmins((prev) => prev.filter((a) => a.id !== adminId));

      toast.success(`Admin ${adminName} deleted successfully`);
    } catch (error: any) {
      toast.error("Failed to delete admin: " + error.message);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-7xl space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <main className="flex-1 overflow-auto p-6">
              <div className="max-w-7xl mx-auto">
                <div className="mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Admin Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage administrator accounts and permissions
              </p>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                    <DialogDescription>
                      Add a new administrator to the system
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAdmin}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="create-fullName">Full Name</Label>
                        <Input
                          id="create-fullName"
                          value={createFullName}
                          onChange={(e) => setCreateFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="create-email">Email</Label>
                        <Input
                          id="create-email"
                          type="email"
                          value={createEmail}
                          onChange={(e) => setCreateEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="create-password">Password</Label>
                        <Input
                          id="create-password"
                          type="password"
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="create-department">Department</Label>
                        <Select
                          value={createDepartment}
                          onValueChange={setCreateDepartment}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="graphics">Graphics</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="accounting">Accounting</SelectItem>
                            <SelectItem value="uiux">UI/UX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={createLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createLoading}>
                        {createLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Admin
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No admins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.full_name}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell className="capitalize">
                          {admin.department || "N/A"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(admin.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingAdmin(admin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeleteAdmin(admin.id, admin.full_name)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAdmins.length} of {admins.length} admins
            </div>
              </div>
            </main>
          )}
        </div>

        {editingAdmin && (
          <Dialog
            open={!!editingAdmin}
            onOpenChange={(open) => !open && setEditingAdmin(null)}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Admin</DialogTitle>
                <DialogDescription>
                  Update administrator information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditAdmin}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fullName">Full Name</Label>
                    <Input
                      id="edit-fullName"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Select
                      value={editDepartment}
                      onValueChange={setEditDepartment}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="graphics">Graphics</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                        <SelectItem value="uiux">UI/UX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingAdmin(null)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editLoading}>
                    {editLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SidebarProvider>
  );
}
