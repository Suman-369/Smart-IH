const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ["user", "admin"], 
    default: "user" 
  },
}, {
  timestamps: true
});

// Only hash password if it's not already hashed
userSchema.pre("save", async function(next) {
  // Only hash if password is modified and not already hashed
  if (!this.isModified("password")) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2)
  if (this.password.startsWith('$2')) return next();

  // Hash password
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const userModel = mongoose.model("user", userSchema)

module.exports = userModel