import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/badge";

interface DepartmentStats {
  userCount: number;
  taskCount: number;
}

const departmentsList = [
  { id: "sales", name: "Sales" },
  { id: "accounting", name: "Accounting" },
  { id: "tech", name: "Tech" },
  { id: "graphics", name: "Graphics" },
  { id: "uiux", name: "UI/UX" },
];

export default function DepartmentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, DepartmentStats>>({});
  const [isAdmin, setIsAdmin] = useState(false);

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
    await fetchDepartmentStats();
  };

  const fetchDepartmentStats = async () => {
    const statsData: Record<string, DepartmentStats> = {};

    for (const dept of departmentsList) {
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.id as any);

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.id as any);

      statsData[dept.id] = {
        userCount: userCount || 0,
        taskCount: taskCount || 0,
      };
    }

    setStats(statsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Department Overview</h1>
                <p className="text-muted-foreground">View department statistics and resources</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departmentsList.map((dept) => (
                <Card key={dept.id}>
                  <CardHeader>
                    <CardTitle>{dept.name}</CardTitle>
                    <CardDescription>Department statistics</CardDescription>
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
                  The system has {departmentsList.length} pre-configured departments. Each department
                  can have assigned users and tasks. Department assignments are managed through the
                  user management interface.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
