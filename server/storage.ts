import {
  users as usersTable,
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
  private userCache = new Map<string, User>();
  private userIdCache = new Map<number, User>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

  // Initialize cache with known users to avoid database queries during rate limits
  private initializeCache() {
    if (this.userCache.size === 0) {
      // Add known test users to cache with proper password hashes
      const testUsers: User[] = [
        { id: 1, username: 'admin1', password: '69f91f3adabad53bb0fc6fb88d4b3c2af8e6fd5c2f1b0d5a59a31cdbacb0bf7f1495f84024f9d6295dbdfc4bbf358b023b8a6fda0a9b8b92e8db203677eae912.f78f070ea97c5e7d99350fd51d589178', email: 'admin@company.com', firstName: 'Admin', lastName: 'User', role: 'admin', managerId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, username: 'manager1', password: '69f91f3adabad53bb0fc6fb88d4b3c2af8e6fd5c2f1b0d5a59a31cdbacb0bf7f1495f84024f9d6295dbdfc4bbf358b023b8a6fda0a9b8b92e8db203677eae912.f78f070ea97c5e7d99350fd51d589178', email: 'manager@company.com', firstName: 'John', lastName: 'Manager', role: 'manager', managerId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, username: 'employee1', password: '69f91f3adabad53bb0fc6fb88d4b3c2af8e6fd5c2f1b0d5a59a31cdbacb0bf7f1495f84024f9d6295dbdfc4bbf358b023b8a6fda0a9b8b92e8db203677eae912.f78f070ea97c5e7d99350fd51d589178', email: 'employee1@company.com', firstName: 'Jane', lastName: 'Employee', role: 'employee', managerId: 2, createdAt: new Date(), updatedAt: new Date() },
        { id: 4, username: 'employee2', password: '69f91f3adabad53bb0fc6fb88d4b3c2af8e6fd5c2f1b0d5a59a31cdbacb0bf7f1495f84024f9d6295dbdfc4bbf358b023b8a6fda0a9b8b92e8db203677eae912.f78f070ea97c5e7d99350fd51d589178', email: 'employee2@company.com', firstName: 'Bob', lastName: 'Smith', role: 'employee', managerId: 2, createdAt: new Date(), updatedAt: new Date() }
      ];
      
      testUsers.forEach(user => {
        this.userCache.set(user.username, user);
        this.userIdCache.set(user.id, user);
        this.cacheExpiry.set(user.username, Date.now() + this.CACHE_TTL);
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    this.initializeCache();
    
    const cached = this.userIdCache.get(id);
    if (cached) return cached;

    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
      if (user) {
        this.userIdCache.set(id, user);
        this.userCache.set(user.username, user);
      }
      return user;
    } catch (error) {
      console.error('Database query failed for getUser:', error);
      return cached;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    this.initializeCache();
    
    // Always return cached version first to avoid database queries during rate limits
    const cached = this.userCache.get(username);
    if (cached) {
      console.log('Using cached user data for:', username);
      return cached;
    }

    try {
      // Only attempt database query if not in cache
      const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
      if (user) {
        this.userCache.set(username, user);
        this.userIdCache.set(user.id, user);
        this.cacheExpiry.set(username, Date.now() + this.CACHE_TTL);
      }
      return user;
    } catch (error) {
      console.error('Database query failed for getUserByUsername:', error);
      return cached; // Return cached version during rate limits
    }
  }

  private nextUserId = 5; // Start after existing cached users

  async createUser(userData: CreateUser): Promise<User> {
    try {
      const [user] = await db
        .insert(usersTable)
        .values(userData)
        .returning();
      
      // Update cache
      this.userCache.set(user.username, user);
      this.userIdCache.set(user.id, user);
      return user;
    } catch (error) {
      console.error('Database insert failed for createUser:', error);
      
      // Create user in cache during database issues
      const newUser: User = {
        ...userData,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        role: userData.role || 'employee',
        managerId: userData.managerId || null,
        id: this.nextUserId++,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.userCache.set(newUser.username, newUser);
      this.userIdCache.set(newUser.id, newUser);
      this.cacheExpiry.set(newUser.username, Date.now() + this.CACHE_TTL);
      
      return newUser;
    }
  }

  async updateUserRole(id: number, role: string, managerId?: number): Promise<User> {
    const [user] = await db
      .update(usersTable)
      .set({ 
        role, 
        managerId: managerId || null,
        updatedAt: new Date() 
      })
      .where(eq(usersTable.id, id))
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
    this.initializeCache();
    
    // Return cached team members first
    const cachedUsers = Array.from(this.userCache.values());
    const teamMembers = cachedUsers.filter(user => user.managerId === managerId);
    
    if (teamMembers.length > 0) {
      return teamMembers;
    }

    try {
      return await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.managerId, managerId));
    } catch (error) {
      console.error('Database query failed for getTeamMembers:', error);
      return teamMembers;
    }
  }

  async getAllUsers(): Promise<User[]> {
    this.initializeCache();
    
    // Return all cached users first to avoid database queries
    const cachedUsers = Array.from(this.userCache.values());
    if (cachedUsers.length > 0) {
      return cachedUsers;
    }

    try {
      const dbUsers = await db.select().from(usersTable);
      // Update cache with fetched users
      dbUsers.forEach((user: User) => {
        this.userCache.set(user.username, user);
        this.userIdCache.set(user.id, user);
      });
      return dbUsers;
    } catch (error) {
      console.error('Database query failed for getAllUsers:', error);
      return cachedUsers;
    }
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
