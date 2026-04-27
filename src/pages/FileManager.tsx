import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Search, Download, Trash2, FileText, Image as ImageIcon } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileData {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploader_name: string;
  uploader_email: string;
  file_type: string;
  related_name?: string;
}

export default function FileManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [searchQuery, files]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!roleData);
    await fetchFiles(session.user.id, !!roleData);
  };

  const fetchFiles = async (userId: string, admin: boolean) => {
    const { data, error } = await supabase
      .from("all_files")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load files", variant: "destructive" });
      setLoading(false);
      return;
    }

    // All users can view all files
    setFiles(data || []);
    setFilteredFiles(data || []);
    setLoading(false);
  };

  const filterFiles = () => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = files.filter(
      (file) =>
        file.file_name.toLowerCase().includes(query) ||
        file.uploader_name.toLowerCase().includes(query) ||
        file.related_name?.toLowerCase().includes(query)
    );
    setFilteredFiles(filtered);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <ImageIcon className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const handleDownload = async (file: FileData) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .download(file.file_path);

    if (error) {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (file: FileData) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete || !isAdmin) return;

    const { error: storageError } = await supabase.storage
      .from("task-attachments")
      .remove([fileToDelete.file_path]);

    if (storageError) {
      toast({ title: "Error", description: "Failed to delete file from storage", variant: "destructive" });
      return;
    }

    const { error: dbError } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", fileToDelete.id);

    if (dbError) {
      toast({ title: "Error", description: "Failed to delete file record", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "File deleted successfully" });
    setFiles(files.filter(f => f.id !== fileToDelete.id));
    setDeleteDialogOpen(false);
    setFileToDelete(null);
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">File Manager</h1>
                <p className="text-muted-foreground">
                  View all files in the system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files by name, uploader, or task..."
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
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No files found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Try a different search term" : "No files have been uploaded yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Uploader</TableHead>
                      <TableHead>Related To</TableHead>
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
                        <TableCell>
                          <div>
                            <p className="font-medium">{file.uploader_name}</p>
                            <p className="text-xs text-muted-foreground">{file.uploader_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{file.related_name || "-"}</TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => confirmDelete(file)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{fileToDelete?.file_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
