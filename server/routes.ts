import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isManager } from "./auth";
import { insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Add explicit API route handler to prevent Vite interference
  app.use('/api', (req, res, next) => {
    // Ensure API routes are handled by Express, not Vite
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Admin routes for role management
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords to frontend
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        managerId: user.managerId,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role, managerId } = req.body;
      
      if (!['admin', 'manager', 'employee'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(parseInt(id), role, managerId);
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        managerId: updatedUser.managerId,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', isManager, async (req: any, res) => {
    try {
      const managerId = req.user.id;

      const validatedData = insertFeedbackSchema.parse({
        ...req.body,
        managerId,
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

  app.get('/api/feedback/employee', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'employee') {
        return res.status(403).json({ message: "Only employees can access this endpoint" });
      }

      const feedbackList = await storage.getFeedbackWithUsers(undefined, userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get('/api/feedback/employee/:employeeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { employeeId } = req.params;
      const employeeIdNum = parseInt(employeeId);

      // Employees can only see their own feedback
      if (req.user.role === 'employee' && userId !== employeeIdNum) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Managers can only see feedback for their team members
      if (req.user.role === 'manager') {
        const employee = await storage.getUser(employeeIdNum);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const feedbackList = await storage.getFeedbackWithUsers(undefined, employeeIdNum);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get('/api/feedback/manager', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const { role, managerId } = req.body;

      if (!['manager', 'employee'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role, managerId);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
