import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employee"), // 'manager' or 'employee'
  managerId: varchar("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  managerId: varchar("manager_id").notNull().references(() => users.id),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  strengths: text("strengths").notNull(),
  improvements: text("improvements").notNull(),
  sentiment: varchar("sentiment").notNull(), // 'positive', 'neutral', 'negative'
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager_employee",
  }),
  employees: many(users, {
    relationName: "manager_employee",
  }),
  givenFeedback: many(feedback, {
    relationName: "manager_feedback",
  }),
  receivedFeedback: many(feedback, {
    relationName: "employee_feedback",
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  manager: one(users, {
    fields: [feedback.managerId],
    references: [users.id],
    relationName: "manager_feedback",
  }),
  employee: one(users, {
    fields: [feedback.employeeId],
    references: [users.id],
    relationName: "employee_feedback",
  }),
}));

// Schemas
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acknowledged: true,
  acknowledgedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
