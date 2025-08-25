const jwt = require("jsonwebtoken");

const authMiddleware = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if(!token) return res.status(401).json({ message: "Unauthorized - Token required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has required role
    if(roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}, but user has role: ${decoded.role}`
      });
    }

    req.user = decoded;
    next();
  } catch(err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
