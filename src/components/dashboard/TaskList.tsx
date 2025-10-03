import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Circle, User, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  department: string;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
  assigned_profile?: {
    full_name: string;
  };
}

interface TaskListProps {
  selectedDepartment: string;
  userId: string;
}

export function TaskList({ selectedDepartment, userId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDepartment, userId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          profiles!tasks_created_by_fkey(full_name),
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment as "sales" | "accounting" | "tech" | "graphics" | "uiux");
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: "todo" | "in_progress" | "completed") => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      todo: "secondary",
      in_progress: "default",
      completed: "default",
    };

    const colors: Record<string, string> = {
      todo: "bg-muted",
      in_progress: "bg-warning/10 text-warning border-warning/20",
      completed: "bg-success/10 text-success border-success/20",
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No tasks found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription className="capitalize mt-1">
                  {task.department}
                </CardDescription>
              </div>
              {getStatusIcon(task.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {getStatusBadge(task.status)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Created by: {task.profiles.full_name}</span>
              </div>
              {task.assigned_profile && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Assigned to: {task.assigned_profile.full_name}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {task.status !== "completed" && (task.created_by === userId || task.assigned_to === userId) && (
              <div className="flex gap-2 pt-2">
                {task.status === "todo" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateTaskStatus(task.id, "in_progress")}
                  >
                    Start Task
                  </Button>
                )}
                {task.status === "in_progress" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateTaskStatus(task.id, "completed")}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
