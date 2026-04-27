import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Users, CheckCircle2, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

interface DepartmentStats {
  userCount: number;
  taskCount: number;
}

export default function DepartmentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Record<string, DepartmentStats>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      navigate("/dashboard");
      toast({ title: "Access Denied", description: "Admin access required", variant: "destructive" });
      return;
    }

    setIsAdmin(true);
    await fetchDepartments();
  };

  const fetchDepartments = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
      toast({ title: "Error", description: "Failed to fetch departments", variant: "destructive" });
      setLoading(false);
      return;
    }

    setDepartments(data || []);
    await fetchDepartmentStats(data || []);
    setLoading(false);
  };

  const fetchDepartmentStats = async (deptList: Department[]) => {
    const statsData: Record<string, DepartmentStats> = {};

    for (const dept of deptList) {
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.name as any);

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.name as any);

      statsData[dept.id] = {
        userCount: userCount || 0,
        taskCount: taskCount || 0,
      };
    }

    setStats(statsData);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("departments")
        .insert({
          name: formName as any,
          description: formDescription || null,
        });

      if (error) throw error;

      toast({ title: "Success", description: "Department created successfully" });
      setCreateDialogOpen(false);
      setFormName("");
      setFormDescription("");
      await fetchDepartments();
    } catch (error: any) {
      console.error("Error creating department:", error);
      toast({ title: "Error", description: error.message || "Failed to create department", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment) return;
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("departments")
        .update({
          description: formDescription || null,
        })
        .eq("id", editingDepartment.id);

      if (error) throw error;

      toast({ title: "Success", description: "Department updated successfully" });
      setEditDialogOpen(false);
      setEditingDepartment(null);
      setFormDescription("");
      await fetchDepartments();
    } catch (error: any) {
      console.error("Error updating department:", error);
      toast({ title: "Error", description: error.message || "Failed to update department", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deptId);

      if (error) throw error;

      toast({ title: "Success", description: "Department deleted successfully" });
      await fetchDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast({ title: "Error", description: error.message || "Failed to delete department", variant: "destructive" });
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    setFormDescription(dept.description || "");
    setEditDialogOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">Department Management</h1>
                  <p className="text-muted-foreground">Manage departments, view statistics and resources</p>
                </div>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <Card key={dept.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="capitalize">{dept.name}</CardTitle>
                        <CardDescription>
                          {dept.description || "No description"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(dept)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Department</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{dept.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Users</span>
                        </div>
                        <Badge variant="secondary">{stats[dept.id]?.userCount || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Tasks</span>
                        </div>
                        <Badge variant="secondary">{stats[dept.id]?.taskCount || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About Departments</CardTitle>
                <CardDescription>Department structure information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The system has {departments.length} configured departments. Each department
                  can have assigned users and tasks. Department assignments are managed through the
                  user management interface.
                </p>
              </CardContent>
            </Card>
              </div>
            </div>
          )}
        </main>

      {/* Create Department Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateDepartment}>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>
                Add a new department to the system
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  placeholder="Enter department name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-description">Description</Label>
                <Textarea
                  id="dept-description"
                  placeholder="Enter department description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditDepartment}>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                Update department details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input
                  value={editingDepartment?.name || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Department name cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dept-description">Description</Label>
                <Textarea
                  id="edit-dept-description"
                  placeholder="Enter department description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </SidebarProvider>
  );
}
