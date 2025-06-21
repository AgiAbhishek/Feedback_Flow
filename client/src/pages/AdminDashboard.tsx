import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Shield, UserCheck, UserX, MessageSquare, Clock } from "lucide-react";
import type { User, Feedback } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'admin',
  });

  const { data: allFeedback = [], isLoading: feedbackLoading } = useQuery<(Feedback & { manager: User; employee: User })[]>({
    queryKey: ["/api/admin/feedback"],
    enabled: user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, managerId }: { userId: number; role: string; managerId?: number }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role, managerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    const managerId = newRole === 'employee' ? parseInt(selectedManagerId) || undefined : undefined;
    updateRoleMutation.mutate({ userId, role: newRole, managerId });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'employee': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const managers = allUsers.filter(u => u.role === 'manager');
  const employees = allUsers.filter(u => u.role === 'employee');
  const adminCount = allUsers.filter(u => u.role === 'admin').length;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
          <p className="text-gray-600">Manage user roles and system administration</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{allUsers.length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Administrators</p>
                  <p className="text-2xl font-bold text-gray-900">{adminCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Shield className="text-red-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-gray-900">{managers.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="text-blue-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserX className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Tracking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <div className="flex items-center space-x-4">
                    <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select manager for employees" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id.toString()}>
                            {manager.firstName} {manager.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-32"></div>
                            <div className="h-3 bg-gray-300 rounded w-48"></div>
                          </div>
                        </div>
                        <div className="w-24 h-8 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500">Users will appear here once they are created.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allUsers.map((userItem) => (
                      <div key={userItem.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {(userItem.firstName?.charAt(0) || '') + (userItem.lastName?.charAt(0) || '')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {userItem.firstName} {userItem.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">{userItem.email}</p>
                            <Badge className={`mt-1 ${getRoleColor(userItem.role)}`}>
                              {userItem.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Select
                            value={userItem.role}
                            onValueChange={(newRole) => handleRoleChange(userItem.id, newRole)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Feedback Tracking</h3>
                <p className="text-sm text-gray-600 mt-1">Monitor all feedback across the organization</p>
              </div>
              <CardContent className="p-6">
                {feedbackLoading ? (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                    <p className="mt-2 text-sm text-gray-500">Loading feedback data...</p>
                  </div>
                ) : allFeedback.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
                    <p className="mt-1 text-sm text-gray-500">Feedback submissions will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allFeedback.map((feedback) => (
                      <div key={feedback.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {feedback.manager.firstName} {feedback.manager.lastName}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium text-gray-900">
                                {feedback.employee.firstName} {feedback.employee.lastName}
                              </span>
                              <Badge variant={feedback.sentiment === 'positive' ? 'default' : feedback.sentiment === 'neutral' ? 'secondary' : 'destructive'}>
                                {feedback.sentiment}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-green-700">Strengths:</span>
                                <p className="text-sm text-gray-600 mt-1">{feedback.strengths}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-blue-700">Areas for Improvement:</span>
                                <p className="text-sm text-gray-600 mt-1">{feedback.improvements}</p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-xs text-gray-500">
                              {new Date(feedback.createdAt!).toLocaleDateString()}
                            </div>
                            {feedback.acknowledged ? (
                              <Badge variant="outline" className="mt-1">
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="mt-1">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}