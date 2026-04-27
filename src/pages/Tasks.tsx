import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { TaskList } from "@/components/dashboard/TaskList";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";

export default function Tasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const departmentParam = searchParams.get("department") || "all";
  const [selectedDepartment, setSelectedDepartment] = useState<string>(departmentParam);

  useEffect(() => {
    setSelectedDepartment(departmentParam);
  }, [departmentParam]);

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

  if (!session && !loading) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {loading || !session ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {selectedDepartment === "all" ? "All Tasks" : selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Manage and track your team's tasks
                    </p>
                  </div>
                  <CreateTaskDialog />
                </div>

                <TaskList
                  selectedDepartment={selectedDepartment}
                  userId={session.user.id}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
