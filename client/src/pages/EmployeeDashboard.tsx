import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell, ThumbsUp, CheckCircle, Star, Target } from "lucide-react";
import type { User, Feedback } from "@shared/schema";

export default function EmployeeDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: feedbackData = [], isLoading: feedbackLoading } = useQuery<(Feedback & { manager: User; employee: User })[]>({
    queryKey: ["/api/feedback/employee", user?.id],
    enabled: isAuthenticated && user?.role === 'employee' && !!user.id,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (feedbackId: number) => {
      await apiRequest("PATCH", `/api/feedback/${feedbackId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/employee", user?.id] });
      toast({
        title: "Feedback Acknowledged",
        description: "You have successfully acknowledged this feedback.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to acknowledge feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalFeedback = feedbackData.length;
  const unreadFeedback = feedbackData.filter(f => !f.acknowledged).length;
  const latestFeedback = feedbackData.length > 0 ? feedbackData[0] : null;

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName || '';
    const last = lastName || '';
    return (first.charAt(0) + last.charAt(0)).toUpperCase() || '??';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-success-100 text-success-700';
      case 'neutral': return 'bg-warning-100 text-warning-700';
      case 'negative': return 'bg-danger-100 text-danger-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'Positive';
      case 'neutral': return 'Neutral';
      case 'negative': return 'Needs Improvement';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 21) return '2 weeks ago';
    if (diffDays < 28) return '3 weeks ago';
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Feedback Timeline</h2>
          <p className="text-gray-600">View and acknowledge feedback you've received from your manager</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFeedback}</p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="text-primary" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread Feedback</p>
                  <p className="text-2xl font-bold text-danger-600">{unreadFeedback}</p>
                </div>
                <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
                  <Bell className="text-danger-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Latest Rating</p>
                  <p className="text-2xl font-bold text-success-600">
                    {latestFeedback ? getSentimentLabel(latestFeedback.sentiment) : 'None'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                  <ThumbsUp className="text-success-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Timeline */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
          </div>
          <CardContent className="p-6">
            {feedbackLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="relative">
                      <div className="absolute left-4 top-4 w-3 h-3 bg-gray-300 rounded-full"></div>
                      <div className="bg-gray-50 border-l-4 border-gray-300 rounded-lg p-6 ml-10">
                        <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-300 rounded"></div>
                          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : feedbackData.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Feedback from your manager will appear here when available.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {feedbackData.map((feedback) => {
                  const isUnread = !feedback.acknowledged;
                  
                  return (
                    <div key={feedback.id} className="relative">
                      <div className={`absolute left-4 top-4 w-3 h-3 rounded-full ${
                        isUnread ? 'bg-danger-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`border-l-4 rounded-lg p-6 ml-10 ${
                        isUnread 
                          ? 'bg-danger-50 border-danger-500' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {getInitials(feedback.manager.firstName, feedback.manager.lastName)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {feedback.manager.firstName} {feedback.manager.lastName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Manager • {formatDate(feedback.createdAt!)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSentimentColor(feedback.sentiment)}>
                              {getSentimentLabel(feedback.sentiment)}
                            </Badge>
                            <Badge className={isUnread ? 'bg-danger-100 text-danger-700' : 'bg-gray-100 text-gray-700'}>
                              {isUnread ? 'Unread' : 'Read'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                              <Star className="mr-2 text-yellow-500" size={16} />
                              Strengths
                            </h5>
                            <p className="text-gray-700">{feedback.strengths}</p>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                              <Target className="mr-2 text-blue-500" size={16} />
                              Areas to Improve
                            </h5>
                            <p className="text-gray-700">{feedback.improvements}</p>
                          </div>
                        </div>
                        
                        <div className={`mt-6 pt-4 border-t ${
                          isUnread ? 'border-danger-200' : 'border-gray-200'
                        }`}>
                          {isUnread ? (
                            <div className="flex items-center space-x-3">
                              <Button 
                                onClick={() => acknowledgeMutation.mutate(feedback.id)}
                                disabled={acknowledgeMutation.isPending}
                                className="bg-primary text-white hover:bg-primary-600"
                              >
                                {acknowledgeMutation.isPending ? 'Marking...' : 'Mark as Read'}
                              </Button>
                              <Button variant="outline" size="sm">
                                Add Response
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <CheckCircle className="text-success-500" size={16} />
                              <span>
                                Acknowledged on {feedback.acknowledgedAt ? new Date(feedback.acknowledgedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
