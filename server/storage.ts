import {
  users,
  feedback,
  type User,
  type UpsertUser,
  type Feedback,
  type InsertFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Feedback operations
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByEmployee(employeeId: string): Promise<Feedback[]>;
  getFeedbackByManager(managerId: string): Promise<Feedback[]>;
  updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback>;
  acknowledgeFeedback(id: number): Promise<Feedback>;
  
  // Team operations
  getTeamMembers(managerId: string): Promise<User[]>;
  getFeedbackWithUsers(managerId?: string, employeeId?: string): Promise<(Feedback & { manager: User; employee: User })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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

  async getFeedbackByEmployee(employeeId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.employeeId, employeeId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByManager(managerId: string): Promise<Feedback[]> {
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

  async getTeamMembers(managerId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.managerId, managerId));
  }

  async getFeedbackWithUsers(managerId?: string, employeeId?: string): Promise<(Feedback & { manager: User; employee: User })[]> {
    let query = db
      .select({
        id: feedback.id,
        managerId: feedback.managerId,
        employeeId: feedback.employeeId,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        sentiment: feedback.sentiment,
        acknowledged: feedback.acknowledged,
        acknowledgedAt: feedback.acknowledgedAt,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        manager: users,
        employee: users,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.managerId, users.id))
      .leftJoin(users, eq(feedback.employeeId, users.id));

    if (managerId) {
      query = query.where(eq(feedback.managerId, managerId));
    }
    if (employeeId) {
      query = query.where(eq(feedback.employeeId, employeeId));
    }

    // This is a simplified approach - in practice, you'd need proper joins
    const results = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));

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
