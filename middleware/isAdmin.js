function isAdmin(req, res, next) {
  const user = req.user;
  // console.log("User role in isAdmin middleware:", user?.role); // Log the role

  if (user && user.role === "admin") {
    return next(); // Allow access if the user is an admin
  } else {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
}

module.exports = isAdmin;
