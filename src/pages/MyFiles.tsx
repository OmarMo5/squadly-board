import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Search, Download, FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MyFileData {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string | null;
  task_title: string;
  task_id: string;
}

export default function MyFiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<MyFileData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MyFileData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredFiles(
      files.filter(
        (f) =>
          f.file_name.toLowerCase().includes(query) ||
          f.task_title.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, files]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchMyFiles(session.user.id);
  };

  const fetchMyFiles = async (userId: string) => {
    // Get task IDs where user is assigned or creator
    const [{ data: assignments }, { data: createdTasks }] = await Promise.all([
      supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("id")
        .eq("created_by", userId)
        .is("deleted_at", null),
    ]);

    const taskIds = new Set<string>();
    assignments?.forEach((a) => taskIds.add(a.task_id));
    createdTasks?.forEach((t) => taskIds.add(t.id));

    if (taskIds.size === 0) {
      setFiles([]);
      setLoading(false);
      return;
    }

    const { data: attachments, error } = await supabase
      .from("task_attachments")
      .select("id, file_name, file_path, file_size, created_at, task_id, tasks(title)")
      .in("task_id", Array.from(taskIds))
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load files", variant: "destructive" });
      setLoading(false);
      return;
    }

    const mapped: MyFileData[] = (attachments || []).map((a: any) => ({
      id: a.id,
      file_name: a.file_name,
      file_path: a.file_path,
      file_size: a.file_size,
      created_at: a.created_at,
      task_title: a.tasks?.title || "Unknown Task",
      task_id: a.task_id,
    }));

    setFiles(mapped);
    setFilteredFiles(mapped);
    setLoading(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <ImageIcon className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .download(filePath);

    if (error) {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
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
                <h1 className="text-3xl font-bold">My Files</h1>
                <p className="text-muted-foreground">
                  Files from tasks assigned to you or created by you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by file name or task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
              </div>
            </div>

            {filteredFiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Paperclip className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No files found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Try a different search term" : "No files attached to your tasks yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.file_name)}
                            <span className="font-medium">{file.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.task_title}</TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>
                          {file.created_at
                            ? formatDistanceToNow(new Date(file.created_at), { addSuffix: true })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(file.file_path, file.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
