import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Paperclip, Download, PlayCircle, Loader2, CheckCheck } from "lucide-react";
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
  deleted_at: string | null;
  assigned_profile?: {
    full_name: string;
  } | null;
  creator_profile?: {
    full_name: string;
  } | null;
  task_attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
  }>;
  task_assignments?: Array<{
    user_id: string;
    profiles: {
      full_name: string;
    };
  }>;
  task_completions?: Array<{
    user_id: string;
  }>;
}

interface TaskListProps {
  selectedDepartment: string;
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
        creator_profile:profiles!created_by(full_name),
        task_attachments(id, file_name, file_path),
        task_assignments(user_id, profiles(full_name)),
        task_completions(user_id)
      `)
      .order("created_at", { ascending: false });

    // Admins see all tasks including deleted, others only see non-deleted
    if (!isAdmin) {
      query = query.is("deleted_at", null);
    }

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
    // Soft delete - only set deleted_at timestamp
    const { error } = await supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
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

  const handleMarkComplete = async (taskId: string) => {
    setUpdatingStatus(taskId);

    // Check if already completed
    const { data: existing } = await supabase
      .from("task_completions")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Unmark completion
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (error) {
        toast.error("Failed to update completion status");
      } else {
        toast.success("Completion status updated");
      }
    } else {
      // Mark as complete
      const { error } = await supabase
        .from("task_completions")
        .insert({
          task_id: taskId,
          user_id: userId,
        });

      if (error) {
        toast.error("Failed to mark as complete");
      } else {
        toast.success("Marked as complete!");
      }
    }

    setUpdatingStatus(null);
    fetchTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: "todo" | "in_progress" | "completed") => {
    setUpdatingStatus(taskId);

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task status");
    } else {
      toast.success("Task status updated!");
    }

    setUpdatingStatus(null);
    fetchTasks();
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .download(filePath);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusButtonConfig = (status: string) => {
    const configs = {
      todo: {
        label: "Start",
        icon: PlayCircle,
        variant: "default" as const,
        disabled: false,
      },
      in_progress: {
        label: "In Progress",
        icon: Loader2,
        variant: "secondary" as const,
        disabled: false,
      },
      completed: {
        label: "Completed",
        icon: CheckCheck,
        variant: "outline" as const,
        disabled: true,
      },
    };

    return configs[status as keyof typeof configs] || configs.todo;
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const renderTaskCard = (task: Task) => {
    const buttonConfig = getStatusButtonConfig(task.status);
    const ButtonIcon = buttonConfig.icon;
    const isUpdating = updatingStatus === task.id;
    const isDeleted = task.deleted_at !== null;
    const isAssignedToMe = task.task_assignments?.some(a => a.user_id === userId) || false;
    const myCompletion = task.task_completions?.find(c => c.user_id === userId);
    const totalAssigned = task.task_assignments?.length || 0;
    const totalCompleted = task.task_completions?.length || 0;

    return (
      <Card key={task.id} className={`hover:shadow-md transition-shadow mb-4 ${isDeleted ? "opacity-50 border-destructive" : ""}`}>
        <CardHeader>
          {isDeleted && (
            <Badge variant="destructive" className="w-fit mb-2">
              Deleted {formatDistanceToNow(new Date(task.deleted_at!), { addSuffix: true })}
            </Badge>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{task.title}</CardTitle>
              {task.description && (
                <CardDescription className="text-sm">
                  {task.description}
                </CardDescription>
              )}
            </div>
            {canEditOrDelete(task) && !isDeleted && (
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
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {task.department}
              </Badge>
              {task.creator_profile && (
                <div className="flex items-center gap-1">
                  <span>Created by:</span>
                  <span className="font-medium">{task.creator_profile.full_name}</span>
                </div>
              )}
              {task.task_assignments && task.task_assignments.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span>Assigned to:</span>
                  {task.task_assignments.map((assignment, idx) => (
                    <span key={assignment.user_id} className="font-medium">
                      {assignment.profiles.full_name}
                      {idx < task.task_assignments!.length - 1 && ","}
                    </span>
                  ))}
                  <Badge variant="outline" className="ml-1">
                    {totalCompleted}/{totalAssigned} completed
                  </Badge>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {task.task_attachments && task.task_attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attachments:</p>
                <div className="space-y-1">
                  {task.task_attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Paperclip className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{attachment.file_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(attachment.file_path, attachment.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </span>
              <div className="flex gap-2">
                {!isDeleted && isAdmin && (
                  <div className="flex gap-1">
                    {task.status !== "todo" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "todo")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move to Start"}
                      </Button>
                    )}
                    {task.status !== "in_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "in_progress")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move to In Progress"}
                      </Button>
                    )}
                    {task.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "completed")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move to Complete"}
                      </Button>
                    )}
                  </div>
                )}
                {!isDeleted && !isAdmin && canEditOrDelete(task) && (
                  <div className="flex gap-1">
                    {task.status === "todo" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "in_progress")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move to In Progress"}
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, "completed")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Completed"}
                      </Button>
                    )}
                  </div>
                )}
                {!isDeleted && isAssignedToMe && (
                  <Button
                    variant={myCompletion ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleMarkComplete(task.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className={`h-4 w-4 mr-2 ${myCompletion ? "fill-current" : ""}`} />
                    )}
                    {myCompletion ? "Completed" : "Mark Complete"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <TaskSkeleton />
          </div>
          <div>
            <TaskSkeleton />
          </div>
          <div>
            <TaskSkeleton />
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-lg">Start</h3>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            {todoTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No tasks</p>
                </CardContent>
              </Card>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>

          {/* In Progress Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-lg">In Progress</h3>
              <Badge variant="secondary">{inProgressTasks.length}</Badge>
            </div>
            {inProgressTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No tasks</p>
                </CardContent>
              </Card>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>

          {/* Complete Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-lg">Complete</h3>
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </div>
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No tasks</p>
                </CardContent>
              </Card>
            ) : (
              completedTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      )}

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
