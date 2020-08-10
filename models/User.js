const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  googleId: {
    type: String
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  teamIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "teams"
    }
  ],
  name: String,
  passwordDigest: String,
  isAdmin: Boolean
});

const User = mongoose.model("users", userSchema);
module.exports = User;
