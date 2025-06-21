import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import FeedbackForm from "@/components/FeedbackForm";
import EmployeeForm from "@/components/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, ThumbsUp, Clock, Plus, UserPlus } from "lucide-react";
import type { User, Feedback } from "@shared/schema";

export default function ManagerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

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

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<User[]>({
    queryKey: ["/api/team"],
    enabled: isAuthenticated && user?.role === 'manager',
  });

  const { data: feedbackData = [], isLoading: feedbackLoading } = useQuery<(Feedback & { manager: User; employee: User })[]>({
    queryKey: ["/api/feedback/manager"],
    enabled: isAuthenticated && user?.role === 'manager',
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalFeedback = feedbackData.length;
  const positiveFeedback = feedbackData.filter(f => f.sentiment === 'positive').length;
  const positivePercentage = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0;
  const pendingCount = teamMembers.filter(member => 
    !feedbackData.some(f => f.employeeId === member.id)
  ).length;

  const getLastFeedbackForMember = (memberId: string) => {
    const memberFeedback = feedbackData.filter(f => f.employeeId === memberId);
    return memberFeedback.length > 0 ? memberFeedback[0] : null;
  };

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

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Overview</h2>
          <p className="text-gray-600">Monitor your team's feedback activity and sentiment trends</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Users className="text-primary" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Feedback Given</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFeedback}</p>
                </div>
                <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="text-success-600" size={24} />
                </div>
              </div>
              {totalFeedback > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-success-600">Active feedback loop</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Positive Sentiment</p>
                  <p className="text-2xl font-bold text-gray-900">{positivePercentage}%</p>
                </div>
                <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                  <ThumbsUp className="text-success-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                </div>
                <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
                  <Clock className="text-warning-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowEmployeeForm(true)}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <UserPlus className="mr-2" size={16} />
                  Add Employee
                </Button>
                <Button 
                  onClick={() => setShowFeedbackForm(true)}
                  className="bg-primary text-white hover:bg-primary-600"
                >
                  <Plus className="mr-2" size={16} />
                  Give Feedback
                </Button>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {teamLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/6"></div>
                      </div>
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                <p className="mt-1 text-sm text-gray-500">Team members will appear here once assigned to you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => {
                  const lastFeedback = getLastFeedbackForMember(member.id);
                  const memberFeedbackCount = feedbackData.filter(f => f.employeeId === member.id).length;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {getInitials(member.firstName, member.lastName)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          {lastFeedback ? (
                            <>
                              <p className="text-sm font-medium text-gray-900">
                                Last feedback: {new Date(lastFeedback.createdAt!).toLocaleDateString()}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getSentimentColor(lastFeedback.sentiment)}>
                                  {getSentimentLabel(lastFeedback.sentiment)}
                                </Badge>
                                <span className="text-xs text-gray-500">{memberFeedbackCount} total reviews</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-danger-600">No feedback yet</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className="bg-gray-100 text-gray-700">New member</Badge>
                              </div>
                            </>
                          )}
                        </div>
                        {lastFeedback ? (
                          <Button variant="outline" size="sm">
                            View History
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => setShowFeedbackForm(true)}
                            size="sm"
                            className="bg-primary text-white hover:bg-primary-600"
                          >
                            Give Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {showFeedbackForm && (
          <FeedbackForm
            teamMembers={teamMembers}
            onClose={() => setShowFeedbackForm(false)}
          />
        )}

        {showEmployeeForm && (
          <EmployeeForm
            open={showEmployeeForm}
            onClose={() => setShowEmployeeForm(false)}
            currentUserId={user?.id || 0}
            managers={[{ id: user?.id || 0, firstName: user?.firstName || '', lastName: user?.lastName || '' }]}
          />
        )}
      </div>
    </Layout>
  );
}
