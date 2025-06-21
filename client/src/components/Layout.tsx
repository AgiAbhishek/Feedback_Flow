import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, BarChart3, Users, Plus, History, LogOut } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear the user data from cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
      // Reload the page to go back to auth
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName || '';
    const last = lastName || '';
    return (first.charAt(0) + last.charAt(0)).toUpperCase() || '??';
  };

  const isManager = user?.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white" size={16} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">FeedbackFlow</h1>
            <Badge className={isManager ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700'}>
              {isManager ? 'Manager' : 'Employee'}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.firstName} {user?.lastName}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-6">
            <ul className="space-y-2">
              {isManager ? (
                <>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-primary bg-primary-50 px-3 py-2 rounded-lg font-medium">
                      <BarChart3 size={16} />
                      <span>Dashboard</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg">
                      <Users size={16} />
                      <span>My Team</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg">
                      <Plus size={16} />
                      <span>Give Feedback</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg">
                      <History size={16} />
                      <span>Feedback History</span>
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-primary bg-primary-50 px-3 py-2 rounded-lg font-medium">
                      <BarChart3 size={16} />
                      <span>My Feedback</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg">
                      <History size={16} />
                      <span>Feedback History</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg">
                      <Plus size={16} />
                      <span>Request Feedback</span>
                    </a>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
