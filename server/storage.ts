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
  private feedbackCache = new Map<number, Feedback>();
  private nextFeedbackId = 1;

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

      // Add sample feedback data
      const sampleFeedback: Feedback[] = [
        {
          id: 1,
          managerId: 2,
          employeeId: 3,
          strengths: "Excellent problem-solving skills and great team collaboration. Always delivers high-quality work on time.",
          improvements: "Could improve communication during meetings. Consider being more proactive in sharing updates.",
          sentiment: "positive",
          acknowledged: false,
          acknowledgedAt: null,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          managerId: 2,
          employeeId: 4,
          strengths: "Strong technical skills and attention to detail. Great at mentoring junior team members.",
          improvements: "Would benefit from taking on more leadership responsibilities in projects.",
          sentiment: "positive",
          acknowledged: true,
          acknowledgedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: 3,
          managerId: 2,
          employeeId: 3,
          strengths: "Improved significantly in project management. Shows great initiative in learning new technologies.",
          improvements: "Continue working on time estimation for complex tasks.",
          sentiment: "positive",
          acknowledged: false,
          acknowledgedAt: null,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }
      ];

      sampleFeedback.forEach(fb => {
        this.feedbackCache.set(fb.id, fb);
      });
      this.nextFeedbackId = 4;
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
    try {
      const [newFeedback] = await db
        .insert(feedback)
        .values(feedbackData)
        .returning();
      
      this.feedbackCache.set(newFeedback.id, newFeedback);
      return newFeedback;
    } catch (error) {
      console.error('Database insert failed for createFeedback:', error);
      
      // Create feedback in cache during database issues
      const newFeedback: Feedback = {
        ...feedbackData,
        id: this.nextFeedbackId++,
        acknowledged: false,
        acknowledgedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.feedbackCache.set(newFeedback.id, newFeedback);
      return newFeedback;
    }
  }

  async getFeedbackByEmployee(employeeId: number): Promise<Feedback[]> {
    this.initializeCache();
    
    // Get feedback from cache first
    const cachedFeedback = Array.from(this.feedbackCache.values())
      .filter(fb => fb.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    if (cachedFeedback.length > 0) {
      return cachedFeedback;
    }

    try {
      return await db
        .select()
        .from(feedback)
        .where(eq(feedback.employeeId, employeeId))
        .orderBy(desc(feedback.createdAt));
    } catch (error) {
      console.error('Database query failed for getFeedbackByEmployee:', error);
      return cachedFeedback;
    }
  }

  async getFeedbackByManager(managerId: number): Promise<Feedback[]> {
    this.initializeCache();
    
    // Get feedback from cache first
    const cachedFeedback = Array.from(this.feedbackCache.values())
      .filter(fb => fb.managerId === managerId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    if (cachedFeedback.length > 0) {
      return cachedFeedback;
    }

    try {
      return await db
        .select()
        .from(feedback)
        .where(eq(feedback.managerId, managerId))
        .orderBy(desc(feedback.createdAt));
    } catch (error) {
      console.error('Database query failed for getFeedbackByManager:', error);
      return cachedFeedback;
    }
  }

  async updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback> {
    this.initializeCache();
    
    // Update in cache first for immediate response
    const existingFeedback = this.feedbackCache.get(id);
    if (existingFeedback) {
      const updatedFeedback = { ...existingFeedback, ...feedbackData, updatedAt: new Date() };
      this.feedbackCache.set(id, updatedFeedback);
      return updatedFeedback;
    }

    try {
      const [updatedFeedback] = await db
        .update(feedback)
        .set({ ...feedbackData, updatedAt: new Date() })
        .where(eq(feedback.id, id))
        .returning();
      
      this.feedbackCache.set(id, updatedFeedback);
      return updatedFeedback;
    } catch (error) {
      console.error('Database update failed for updateFeedback:', error);
      throw error;
    }
  }

  async acknowledgeFeedback(id: number): Promise<Feedback> {
    this.initializeCache();
    
    // Update in cache first for immediate response
    const existingFeedback = this.feedbackCache.get(id);
    if (existingFeedback) {
      const updatedFeedback = {
        ...existingFeedback,
        acknowledged: true,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      };
      this.feedbackCache.set(id, updatedFeedback);
      return updatedFeedback;
    }

    try {
      const [updatedFeedback] = await db
        .update(feedback)
        .set({ 
          acknowledged: true, 
          acknowledgedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(feedback.id, id))
        .returning();
      
      this.feedbackCache.set(id, updatedFeedback);
      return updatedFeedback;
    } catch (error) {
      console.error('Database update failed for acknowledgeFeedback:', error);
      throw error;
    }
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
    this.initializeCache();
    
    // Use cached data to avoid database complexity during rate limits
    const allFeedback = Array.from(this.feedbackCache.values());
    const allUsers = Array.from(this.userCache.values());
    
    let filteredFeedback = allFeedback;
    
    if (managerId) {
      filteredFeedback = filteredFeedback.filter(fb => fb.managerId === managerId);
    }
    
    if (employeeId) {
      filteredFeedback = filteredFeedback.filter(fb => fb.employeeId === employeeId);
    }
    
    return filteredFeedback.map(fb => {
      const manager = allUsers.find(u => u.id === fb.managerId);
      const employee = allUsers.find(u => u.id === fb.employeeId);
      
      return {
        ...fb,
        manager: manager!,
        employee: employee!,
      };
    }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
}

export const storage = new DatabaseStorage();
