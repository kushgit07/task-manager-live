import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { tasks, categories, users } from "./src/db/schema.ts";
import { eq, desc, and } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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

      const { title, description, status, priority, dueDate, categoryId } = req.body;
      const [newTask] = await db.insert(tasks).values({
        userId: user.id,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        categoryId: categoryId || null,
      }).returning();
      res.json({ success: true, data: newTask });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { id } = req.params;
      const { title, description, status, priority, dueDate, categoryId } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'COMPLETED') updateData.completedAt = new Date();
        else updateData.completedAt = null;
      }
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
        .returning();
      
      if (!updatedTask) return res.status(404).json({ error: "Task not found" });
      res.json({ success: true, data: updatedTask });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).then(res => res[0]);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { id } = req.params;
      const [deletedTask] = await db.delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
        .returning();
      
      if (!deletedTask) return res.status(404).json({ error: "Task not found" });
      res.json({ success: true, data: deletedTask });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the server if we aren't in a serverless environment like Vercel
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
