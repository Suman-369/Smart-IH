const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function register(req, res) {
  try {
    console.log('Registration request received:', {
      body: req.body,
      headers: req.headers['content-type']
    });

    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required"
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
    }
    
    // Always set role to 'user' for new registrations
    const userRole = 'user';
    console.log('User role set to:', userRole);
    
    const isUserExist = await userModel.findOne({
      $or: [
        { email: email }
      ]
    });

    if (isUserExist) {
      return res.status(400).json({
        message: "User with this email already exists"
      });
    }

    console.log('Creating new user...');
    
    // Hash password manually before creating user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name: name,
      email: email,
      password: hashedPassword,
      role: userRole
    });

    console.log('User created successfully:', user._id);

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseData = {
      message: "User registered successfully",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    console.log('Sending registration response:', responseData);

    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    res.status(201).json(responseData);

  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Ensure JSON error response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      message: "Server error during registration", 
      error: error.message 
    });
  }
}

async function login(req, res) {
  try {
    console.log('Login request received:', {
      body: { email: req.body.email, password: '***' },
      headers: req.headers['content-type']
    });

    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      console.log('Login validation failed: Missing credentials');
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await userModel.findOne({ email: email });

    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return res.status(400).json({ 
        message: "Invalid email or password" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Login failed: Invalid password for user:', email);
      return res.status(400).json({ 
        message: "Invalid email or password" 
      });
    }

    console.log('Login successful for user:', email);

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    const responseData = {
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    console.log('Sending login response for user:', user.email);

    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    res.json(responseData);

  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Ensure JSON error response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      message: "Server error during login", 
      error: error.message 
    });
  }
}

module.exports = {
  register,
  login
};
