const signature = require("../config/keys").jwtSecret;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const googleAuthService = require("./googleOAuth");

const GOOGLE = "google";


class AuthService {
  static generateToken({ _id, name, email, isAdmin }) {
    const data = { _id, name, email, isAdmin };
    const expiration = "7 days";
    return jwt.sign({ data }, signature, { expiresIn: expiration });
  };
  
  sendToken(res, user) {
    const token = AuthService.generateToken(user);
    console.log(token);
    res.header("access_token", token).send({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      teamIds: user.teamIds
    });
  };

  static signIn(provider, options) {
    switch (provider) {
      case GOOGLE:
        return async (req, res) => {
          const user = await googleAuthService.handleCallback(req);
          this.sendToken(res, user);
        };
      default:
        return async (req, res) => {
          const { email, password } = req.body;
          const existingUser = await User.findOne({ email });
          if (!existingUser)
            res.status(404).send("Could not find the email address");
          const match = await bcrypt.compare(
            password,
            existingUser.passwordDigest
          );
          if (match) {
            this.sendToken(res, existingUser);
          } else {
            res.status(422).send("Incorrect password");
          }
        };
    }
  }

  static async signUp(req, res, next) {
    const { name, email, password } = req.body;
    const pattern = /\w+@\w+.\w+/;
    if (!pattern.test(email))
      res.status(422).send("Please enter in a valid email address");

    const existingUser = await User.findOne({ email: email });
    if (existingUser) res.status(409).send("This email already exist.");
    if (password.length < 8)
      res.status(422).send("Password has to be longer than 7 characters");

    const passwordDigest = await bcrypt.hash(password, 10);
    const user = await new User({
      name,
      email,
      isAdmin: false,
      passwordDigest: passwordDigest
    }).save();
    this.sendToken(res, user);
  }

  static getCurrentUser(req, res) {
    res.send(req.user.data);
  }
}

module.exports = AuthService;
