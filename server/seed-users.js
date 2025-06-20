import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createHashedPasswords() {
  const password = "password123"; // Default password for all test users
  const hashedPassword = await hashPassword(password);
  console.log("Hashed password:", hashedPassword);
  
  const users = [
    { username: 'admin', role: 'admin', firstName: 'System', lastName: 'Admin', email: 'admin@company.com' },
    { username: 'manager1', role: 'manager', firstName: 'John', lastName: 'Manager', email: 'manager1@company.com' },
    { username: 'manager2', role: 'manager', firstName: 'Sarah', lastName: 'Thompson', email: 'manager2@company.com' },
    { username: 'employee1', role: 'employee', firstName: 'Alice', lastName: 'Johnson', email: 'employee1@company.com', managerId: 2 },
    { username: 'employee2', role: 'employee', firstName: 'Bob', lastName: 'Smith', email: 'employee2@company.com', managerId: 2 },
    { username: 'employee3', role: 'employee', firstName: 'Carol', lastName: 'Davis', email: 'employee3@company.com', managerId: 3 }
  ];

  console.log("SQL INSERT statements:");
  users.forEach(user => {
    const managerPart = user.managerId ? `, ${user.managerId}` : ', NULL';
    console.log(`INSERT INTO users (username, password, email, first_name, last_name, role, manager_id) VALUES ('${user.username}', '${hashedPassword}', '${user.email}', '${user.firstName}', '${user.lastName}', '${user.role}'${managerPart});`);
  });
}

createHashedPasswords().catch(console.error);