import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Admin from "./pages/Admin";
import RolesPermissions from "./pages/RolesPermissions";
import UsersManagement from "./pages/UsersManagement";
import AdminManagement from "./pages/AdminManagement";
import AdminTaskHistory from "./pages/AdminTaskHistory";
import Profile from "./pages/Profile";
import NotificationsCenter from "./pages/NotificationsCenter";
import FileManager from "./pages/FileManager";
import MyFiles from "./pages/MyFiles";
import DepartmentManagement from "./pages/DepartmentManagement";
import NotFound from "./pages/NotFound";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SidebarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/roles" element={<RolesPermissions />} />
              <Route path="/admin/users" element={<UsersManagement />} />
              <Route path="/admin/admins" element={<AdminManagement />} />
              <Route path="/admin/task-history" element={<AdminTaskHistory />} />
              <Route path="/admin/departments" element={<DepartmentManagement />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<NotificationsCenter />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/my-files" element={<MyFiles />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
