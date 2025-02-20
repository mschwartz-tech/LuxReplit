import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt.toString('hex')}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashedPassword, saltHex] = stored.split('.');
    if (!hashedPassword || !saltHex) {
      console.error('Invalid stored password format');
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const hashedSupplied = (await scryptAsync(supplied, salt, 32)) as Buffer;
    const hashedStored = Buffer.from(hashedPassword, 'hex');

    if (hashedSupplied.length !== hashedStored.length) {
      console.error('Buffer length mismatch');
      return false;
    }

    return timingSafeEqual(hashedSupplied, hashedStored);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Set a default SESSION_SECRET if not provided
  const sessionSecret = process.env.SESSION_SECRET || 'your-session-secret-key-here';

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    name: 'session'
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      if (!req.body.username || !req.body.password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error('Registration error:', err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('session');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Create admin user if it doesn't exist
  async function createAdminUser() {
    try {
      const adminUser = await storage.getUserByUsername('admin');
      if (!adminUser) {
        const hashedPassword = await hashPassword('admin');
        await storage.createUser({
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          email: 'admin@luxegym.com',
          name: 'Admin User'
        });
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  createAdminUser();
}