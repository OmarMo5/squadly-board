import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  department: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  department: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
}

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onSuccess }: EditTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [department, setDepartment] = useState(task.department);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""
  );
  const [status, setStatus] = useState(task.status);
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchTaskAssignments();
      // Reset form with task data
      setTitle(task.title);
      setDescription(task.description || "");
      setDepartment(task.department);
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "");
      setStatus(task.status);
    }
  }, [open, task]);

  const fetchTaskAssignments = async () => {
    const { data, error } = await supabase
      .from("task_assignments")
      .select("user_id")
      .eq("task_id", task.id);

    if (!error && data) {
      setAssignedUsers(data.map(a => a.user_id));
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, department")
      .order("full_name");

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setUsers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description: description || null,
          department: department as "sales" | "accounting" | "tech" | "graphics" | "uiux",
          assigned_to: null,
          due_date: dueDate || null,
          status: status as "todo" | "in_progress" | "completed",
        })
        .eq("id", task.id);

      if (error) throw error;

      // Update task assignments
      // First delete existing assignments
      await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", task.id);

      // Then create new assignments
      if (assignedUsers.length > 0) {
        const assignments = assignedUsers.map(userId => ({
          task_id: task.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      }

      toast.success("Task updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = department
    ? users.filter((u) => u.department === department)
    : users;

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and assignment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select value={department} onValueChange={setDepartment} disabled={loading}>
                <SelectTrigger id="edit-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="graphics">Graphics</SelectItem>
                  <SelectItem value="uiux">UI/UX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={loading}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Start</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To (Multiple Users)</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {department ? "No users in this department" : "Select a department first"}
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-user-${user.id}`}
                        checked={assignedUsers.includes(user.id)}
                        onChange={() => toggleUserAssignment(user.id)}
                        disabled={loading}
                        className="rounded border-input"
                      />
                      <Label
                        htmlFor={`edit-user-${user.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {user.full_name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {assignedUsers.length} user(s) selected
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
