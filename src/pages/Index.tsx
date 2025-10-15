import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, CheckCircle, Users, BarChart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full px-4 py-20">
        <div className="text-center space-y-8 max-w-6xl mx-auto">
          <div className="flex justify-center">
            <div className="p-4 bg-primary rounded-3xl shadow-2xl">
              <Briefcase className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">TaskFlow</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A powerful task management and communication platform designed for teams.
            Streamline your workflow, boost productivity, and keep everyone connected.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Sign In
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16 w-full px-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Task Management</h3>
              <p className="text-muted-foreground">
                Create, assign, and track tasks across departments with real-time updates
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Mention team members, share files, and collaborate seamlessly
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-success/10 rounded-xl">
                  <BarChart className="h-8 w-8 text-success" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Department Analytics</h3>
              <p className="text-muted-foreground">
                Track progress across Sales, Tech, Graphics, UI/UX, and Accounting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
