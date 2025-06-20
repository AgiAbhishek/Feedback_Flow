import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertFeedbackSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Star, Target, ThumbsUp, Minus, ThumbsDown } from "lucide-react";
import type { User } from "@shared/schema";

const feedbackFormSchema = insertFeedbackSchema.omit({
  managerId: true,
});

interface FeedbackFormProps {
  teamMembers: User[];
  onClose: () => void;
}

export default function FeedbackForm({ teamMembers, onClose }: FeedbackFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      employeeId: "",
      strengths: "",
      improvements: "",
      sentiment: "positive",
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: z.infer<typeof feedbackFormSchema>) => {
      await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/manager"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been successfully submitted.",
      });
      onClose();
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
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof feedbackFormSchema>) => {
    createFeedbackMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Give Feedback</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} - {member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strengths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Star className="text-yellow-500 mr-1" size={16} />
                      Strengths
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What did this person do well? Be specific and provide examples..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="improvements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Target className="text-blue-500 mr-1" size={16} />
                      Areas to Improve
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What areas could benefit from improvement? Provide constructive suggestions..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sentiment"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Overall Sentiment</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="positive" id="positive" />
                          <label 
                            htmlFor="positive" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <ThumbsUp className="text-success-600" size={16} />
                            <span className="text-sm font-medium text-gray-700">Positive</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="neutral" id="neutral" />
                          <label 
                            htmlFor="neutral" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Minus className="text-warning-600" size={16} />
                            <span className="text-sm font-medium text-gray-700">Neutral</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="negative" id="negative" />
                          <label 
                            htmlFor="negative" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <ThumbsDown className="text-danger-600" size={16} />
                            <span className="text-sm font-medium text-gray-700">Needs Improvement</span>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFeedbackMutation.isPending}
                  className="bg-primary text-white hover:bg-primary-600"
                >
                  {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
