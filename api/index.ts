import express from "express";
import cors from "cors";
import { requireAuth, AuthRequest } from "../src/middleware/auth.js";
import { getOrCreateUser } from "../src/db/users.js";
import { db } from "../src/db/index.js";
import { tasks, categories, users } from "../src/db/schema.js";
import { eq, desc, and } from "drizzle-orm";

const app = express();

app.use(express.json());
app.use(cors());

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "vercel" });
});

// Auth sync route
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const dbUser = await getOrCreateUser(user.uid, user.email || "", user.name);
    res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error("Auth sync failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tasks CRUD
app.get("/api/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const allTasks = await db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(desc(tasks.createdAt));
    res.json({ success: true, data: allTasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newTask = await db.insert(tasks).values({
      ...req.body,
      userId: user.id,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
    }).returning();

    res.json({ success: true, data: newTask[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updateData = { ...req.body };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.status === 'COMPLETED' && req.body.status) {
      updateData.completedAt = new Date();
    } else if (req.body.status) {
      updateData.completedAt = null;
    }

    const updatedTask = await db.update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id)))
      .returning();

    if (!updatedTask.length) return res.status(404).json({ error: "Task not found" });
    res.json({ success: true, data: updatedTask[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const deleted = await db.delete(tasks)
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id)))
      .returning();
      
    if (!deleted.length) return res.status(404).json({ error: "Task not found" });
    res.json({ success: true, data: deleted[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
