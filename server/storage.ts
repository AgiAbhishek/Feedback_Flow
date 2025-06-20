import {
  users,
  feedback,
  type User,
  type CreateUser,
  type Feedback,
  type InsertFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: CreateUser): Promise<User>;
  updateUserRole(id: number, role: string, managerId?: number): Promise<User>;
  
  // Feedback operations
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByEmployee(employeeId: number): Promise<Feedback[]>;
  getFeedbackByManager(managerId: number): Promise<Feedback[]>;
  updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback>;
  acknowledgeFeedback(id: number): Promise<Feedback>;
  
  // Team operations
  getTeamMembers(managerId: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getFeedbackWithUsers(managerId?: number, employeeId?: number): Promise<(Feedback & { manager: User; employee: User })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: CreateUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: string, managerId?: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        role, 
        managerId: managerId || null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return newFeedback;
  }

  async getFeedbackByEmployee(employeeId: number): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.employeeId, employeeId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByManager(managerId: number): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.managerId, managerId))
      .orderBy(desc(feedback.createdAt));
  }

  async updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback> {
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ ...feedbackData, updatedAt: new Date() })
      .where(eq(feedback.id, id))
      .returning();
    return updatedFeedback;
  }

  async acknowledgeFeedback(id: number): Promise<Feedback> {
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ 
        acknowledged: true, 
        acknowledgedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(feedback.id, id))
      .returning();
    return updatedFeedback;
  }

  async getTeamMembers(managerId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.managerId, managerId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getFeedbackWithUsers(managerId?: number, employeeId?: number): Promise<(Feedback & { manager: User; employee: User })[]> {
    // Get feedback based on filters
    let feedbackQuery = db.select().from(feedback).orderBy(desc(feedback.createdAt));
    
    const results = await feedbackQuery;
    const enrichedResults = [];
    
    for (const fb of results) {
      if (managerId && fb.managerId !== managerId) continue;
      if (employeeId && fb.employeeId !== employeeId) continue;

      const manager = await this.getUser(fb.managerId);
      const employee = await this.getUser(fb.employeeId);
      
      if (manager && employee) {
        enrichedResults.push({
          ...fb,
          manager,
          employee,
        });
      }
    }

    return enrichedResults;
  }
}

export const storage = new DatabaseStorage();
