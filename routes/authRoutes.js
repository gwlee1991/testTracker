const AuthService = require("../services/auth");
const Google = require("../services/googleOAuth");
const authMiddleware = require("../middlewares/auth");

module.exports = (app) => {
  app.get("/auth/google", Google.createAuthUrl);
  app.get("/auth/google/callback", AuthService.signIn("google"));
  app.get("/api/currentUser", authMiddleware, AuthService.getCurrentUser);
  app.post("/api/signin", AuthService.signIn);
  app.post("/api/signup", AuthService.signUp);
  // logout needs to be handled by the client by removing the token from broswer storage
};
