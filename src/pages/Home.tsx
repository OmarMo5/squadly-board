import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ListTodo, Clock, Hourglass, CheckCircle2, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatDistanceToNow, differenceInDays } from "date-fns";

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
}

interface TaskAgeData {
  name: string;
  count: number;
}

export default function Home() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ total: 0, todo: 0, inProgress: 0, completed: 0 });
  const [taskAgeData, setTaskAgeData] = useState<TaskAgeData[]>([]);

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
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .is("deleted_at", null);

    if (tasks) {
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        completed: tasks.filter((t) => t.status === "completed").length,
      };
      setStats(taskStats);

      // Calculate task age distribution
      const now = new Date();
      const ageGroups = {
        "0-2 days": 0,
        "3-7 days": 0,
        "8-14 days": 0,
        "15+ days": 0,
      };

      tasks.forEach((task) => {
        if (task.status !== "completed") {
          const age = differenceInDays(now, new Date(task.created_at));
          if (age <= 2) ageGroups["0-2 days"]++;
          else if (age <= 7) ageGroups["3-7 days"]++;
          else if (age <= 14) ageGroups["8-14 days"]++;
          else ageGroups["15+ days"]++;
        }
      });

      setTaskAgeData([
        { name: "0-2 days", count: ageGroups["0-2 days"] },
        { name: "3-7 days", count: ageGroups["3-7 days"] },
        { name: "8-14 days", count: ageGroups["8-14 days"] },
        { name: "15+ days", count: ageGroups["15+ days"] },
      ]);
    }
  };

  if (!session && !loading) {
    return null;
  }

  const pieData = [
    { name: "Start", value: stats.todo, color: "hsl(var(--secondary))" },
    { name: "In Progress", value: stats.inProgress, color: "hsl(var(--warning))" },
    { name: "Completed", value: stats.completed, color: "hsl(var(--success))" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar selectedDepartment="all" onDepartmentChange={() => {}} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground mt-1">
                  Overview of task metrics and performance
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">All active tasks</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Start</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.todo}</div>
                    <p className="text-xs text-muted-foreground mt-1">Waiting to begin</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.inProgress}</div>
                    <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground mt-1">Successfully done</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Distribution</CardTitle>
                    <CardDescription>Current status of all tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Task Age Analysis</CardTitle>
                    <CardDescription>How long tasks have been open</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskAgeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taskAgeData.find(d => d.name === "15+ days" && d.count > 0) && (
                      <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <Clock className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Tasks Requiring Attention</p>
                          <p className="text-sm text-muted-foreground">
                            {taskAgeData.find(d => d.name === "15+ days")?.count} tasks have been open for more than 15 days
                          </p>
                        </div>
                      </div>
                    )}
                    {stats.completed > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <p className="font-medium text-success">Great Progress!</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.completed} tasks completed ({Math.round((stats.completed / stats.total) * 100)}% completion rate)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
