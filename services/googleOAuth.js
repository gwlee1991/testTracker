const axios = require("axios");
const User = require("../models/User");
const { google } = require("googleapis");
const { googleClientID, googleClientSecret } = require("../config/keys");
const redirectUri = "http://localhost:5050/auth/google/callback";

const scopes = ["profile", "email"];

const oauth2Client = new google.auth.OAuth2(
  googleClientID,
  googleClientSecret,
  redirectUri
);

const createAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
};

const handleCallback = async (req) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo?profile%20email",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Length": 0,
        },
      }
    );
    const { sub, name, email } = response.data;
    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = new User({
        googleId: sub,
        name: name,
        email: email,
        isAdmin: false,
      }).save();
    }
    return user;
  } catch (e) {
    return new Error("failed to get user profile");
  }
};

module.exports = {
  createAuthUrl,
  handleCallback,
};
