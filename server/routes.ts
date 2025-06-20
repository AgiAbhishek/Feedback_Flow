import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can create feedback" });
      }

      const validatedData = insertFeedbackSchema.parse({
        ...req.body,
        managerId: userId,
      });

      const newFeedback = await storage.createFeedback(validatedData);
      res.json(newFeedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.get('/api/feedback/employee/:employeeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { employeeId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Employees can only see their own feedback
      if (user.role === 'employee' && userId !== employeeId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Managers can only see feedback for their team members
      if (user.role === 'manager') {
        const employee = await storage.getUser(employeeId);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const feedbackList = await storage.getFeedbackWithUsers(undefined, employeeId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get('/api/feedback/manager', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can access this endpoint" });
      }

      const feedbackList = await storage.getFeedbackWithUsers(userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch('/api/feedback/:id/acknowledge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const feedbackId = parseInt(id);

      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Invalid feedback ID" });
      }

      // Get the feedback to check ownership
      const feedbackList = await storage.getFeedbackWithUsers();
      const targetFeedback = feedbackList.find(f => f.id === feedbackId);

      if (!targetFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      if (targetFeedback.employeeId !== userId) {
        return res.status(403).json({ message: "You can only acknowledge your own feedback" });
      }

      const updatedFeedback = await storage.acknowledgeFeedback(feedbackId);
      res.json(updatedFeedback);
    } catch (error) {
      console.error("Error acknowledging feedback:", error);
      res.status(500).json({ message: "Failed to acknowledge feedback" });
    }
  });

  app.put('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const feedbackId = parseInt(id);

      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Invalid feedback ID" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can edit feedback" });
      }

      // Get the feedback to check ownership
      const feedbackList = await storage.getFeedbackWithUsers(userId);
      const targetFeedback = feedbackList.find(f => f.id === feedbackId);

      if (!targetFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      const validatedData = insertFeedbackSchema.partial().parse(req.body);
      const updatedFeedback = await storage.updateFeedback(feedbackId, validatedData);
      res.json(updatedFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Team routes
  app.get('/api/team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can view team members" });
      }

      const teamMembers = await storage.getTeamMembers(userId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Update user role (for demo purposes)
  app.patch('/api/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, managerId } = req.body;

      if (!['manager', 'employee'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        role,
        managerId: role === 'employee' ? managerId : null,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
