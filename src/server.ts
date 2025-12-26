import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectRedis } from "./config/redis";
import pool from "./config/database";

// Import routes
import authRoutes from "./routes/auth";
import cardRoutes from "./routes/cards";
import barcodeRoutes from "./routes/barcode";
import locationRoutes from "./routes/location";
import offersRoutes from "./routes/offers";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:3001",
          "http://localhost:8081",
          "http://localhost:19006",
        ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// Logging middleware
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Service is healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      success: false,
      message: "Service unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/cards", cardRoutes);
app.use("/api/v1/barcode", barcodeRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/offers", offersRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cardomat Loyalty Card Digital Wallet API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      cards: "/api/v1/cards",
      barcode: "/api/v1/barcode",
      location: "/api/v1/location",
      offers: "/api/v1/offers",
      health: "/health",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);

    res.status(err.status || 500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }
);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Close database connections
  pool.end(() => {
    console.log("Database connections closed");
  });

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log("Testing database connection...");
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully");

    // Connect to Redis
    console.log("Connecting to Redis...");
    await connectRedis();
    console.log("✅ Redis connected successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 Loyalty Card Wallet API ready`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/v1`);
    });

    // Handle server errors
    server.on("error", (error: any) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      switch (error.code) {
        case "EACCES":
          console.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          console.error(`Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();
