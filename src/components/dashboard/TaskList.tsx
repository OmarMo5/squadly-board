import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EditTaskDialog } from "./EditTaskDialog";
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
  assigned_profile?: {
    full_name: string;
  } | null;
  task_attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
  }>;
}

interface TaskListProps {
  selectedDepartment: string;
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    todo: { label: "To Do", className: "bg-secondary" },
    in_progress: { label: "In Progress", className: "bg-warning/20 text-warning border-warning" },
    completed: { label: "Completed", className: "bg-success/20 text-success border-success" },
  };

  const { label, className } = config[status as keyof typeof config] || config.todo;

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function TaskSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export function TaskList({ selectedDepartment, userId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchTasks();
    
    // Subscribe to realtime changes
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

  const checkAdminStatus = async () => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    setIsAdmin(roleData?.role === "admin");
  };

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assigned_profile:profiles!assigned_to(full_name),
        task_attachments(id, file_name, file_path)
      `)
      .order("created_at", { ascending: false });

    if (selectedDepartment !== "all") {
      query = query.eq("department", selectedDepartment as any);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } else {
      setTasks((data as any) || []);
    }

    setLoading(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted successfully");
    fetchTasks();
  };

  const canEditOrDelete = (task: Task) => {
    return task.created_by === userId || task.assigned_to === userId || isAdmin;
  };

  return (
    <>
      <div className="space-y-4">
        {loading ? (
          <>
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No tasks found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a task to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    {task.description && (
                      <CardDescription className="text-sm">
                        {task.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    {canEditOrDelete(task) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTask(task)}
                        >
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
                              <AlertDialogTitle>Delete Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTask(task.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="capitalize">
                        {task.department}
                      </Badge>
                    </div>
                    {task.assigned_profile && (
                      <div className="flex items-center gap-1">
                        <span>Assigned to:</span>
                        <span className="font-medium">{task.assigned_profile.full_name}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                    {task.task_attachments && task.task_attachments.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span>{task.task_attachments.length} attachment(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={fetchTasks}
        />
      )}
    </>
  );
}
