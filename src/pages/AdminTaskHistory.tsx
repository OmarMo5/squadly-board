import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Header } from "@/components/dashboard/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Calendar, CheckCircle2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  department: string;
  created_at: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  deleted_at: string | null;
  completed_at: string | null;
  assigned_profile?: {
    full_name: string;
  } | null;
  creator_profile?: {
    full_name: string;
  } | null;
}

export default function AdminTaskHistory() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "deleted">("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      checkAdminAndFetch();
    }
  }, [session]);

  const checkAdminAndFetch = async () => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session!.user.id)
      .single();

    if (roleData?.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    fetchAllTasks();
  };

  const fetchAllTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_profile:profiles!assigned_to(full_name),
        creator_profile:profiles!created_by(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks((data as any) || []);
    }

    setLoading(false);
  };

  if (!session && !loading) {
    return null;
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.status === "completed";
    if (filter === "deleted") return task.deleted_at !== null;
    return true;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      todo: { label: "Start", className: "bg-secondary" },
      in_progress: { label: "In Progress", className: "bg-warning/20 text-warning border-warning" },
      completed: { label: "Complete", className: "bg-success/20 text-success border-success" },
    };

    const { label, className } = config[status as keyof typeof config] || config.todo;

    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
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
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                      <History className="h-8 w-8" />
                      Task History
                    </h1>
              <p className="text-muted-foreground mt-2">
                Complete history of all tasks including completed and deleted
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                filter === "completed"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Completed ({tasks.filter((t) => t.status === "completed").length})
            </button>
            <button
              onClick={() => setFilter("deleted")}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                filter === "deleted"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Deleted ({tasks.filter((t) => t.deleted_at !== null).length})
            </button>
          </div>

          {/* Task List */}
          <div className="grid gap-4">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No tasks found
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className={task.deleted_at ? "border-destructive" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <StatusBadge status={task.status} />
                          <Badge variant="outline" className="capitalize">
                            {task.department}
                          </Badge>
                          {task.deleted_at && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              Deleted
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <CardDescription>{task.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Created by</p>
                          <p className="font-medium">
                            {task.creator_profile?.full_name || "Unknown"}
                          </p>
                        </div>
                      </div>

                      {task.assigned_profile && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Assigned to</p>
                            <p className="font-medium">{task.assigned_profile.full_name}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {formatDistanceToNow(new Date(task.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>

                      {task.completed_at && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Completed</p>
                            <p className="font-medium">
                              {formatDistanceToNow(new Date(task.completed_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {task.deleted_at && (
                        <div className="flex items-start gap-2">
                          <Trash2 className="h-4 w-4 text-destructive mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Deleted</p>
                            <p className="font-medium">
                              {formatDistanceToNow(new Date(task.deleted_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
