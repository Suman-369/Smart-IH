const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/report");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// Request logging middleware (for debugging) - only log API requests
app.use((req, res, next) => {
  // Only log API requests to reduce noise
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
      contentType: req.headers['content-type'],
      origin: req.headers.origin
    });
  }
  next();
});

// CORS middleware - must be before other middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ message: 'OK' });
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));
app.use(cookieParser());

// Middleware to ensure JSON responses for API routes
app.use('/auth', (req, res, next) => {
  // Set default content type for auth routes
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Middleware to ensure JSON responses for API routes (except report routes which handle file uploads)
app.use('/api', (req, res, next) => {
  // Don't set content type for report routes as they handle file uploads
  if (!req.path.startsWith('/reports')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// API routes
app.use("/auth", authRoutes);
app.use("/api/reports", reportRoutes);



// Test endpoint for debugging
app.post("/api/test", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: "Test endpoint working",
    receivedBody: req.body,
    contentType: req.headers['content-type']
  });
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, "../../frontend")));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Catch-all for API routes that don't exist
app.get("/api/health", async (req, res) => {
    try {
        await mongoose.connection.db.admin().ping();
        res.status(200).json({ status: "healthy" });
    } catch (error) {
        res.status(500).json({ status: "unhealthy", error: error.message });
    }
});

app.all('/api/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    message: `API endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/test',
      'POST /auth/register',
      'POST /auth/login',
      'GET /api/reports',
      'POST /api/reports',
      'GET /api/reports/all'
    ]
  });
});

app.all('/auth/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    message: `Auth endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'POST /auth/register',
      'POST /auth/login'
    ]
  });
});

// Handle clean URLs without .html extensions
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/register.html"));
});

app.get("/user-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/user-dashboard.html"));
});

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/admin-dashboard.html"));
});

// Serve frontend pages for all other routes (for SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler triggered:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Ensure JSON response for API/auth routes
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }

  // For other routes, send generic error
  res.status(500).send('Internal Server Error');
});

module.exports = app;