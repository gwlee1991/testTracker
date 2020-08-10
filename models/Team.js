const mongoose = require("mongoose");
const { Schema } = mongoose;
const RequestSchema = require("./request");

const teamSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  searchableName: {
      type: String
  },
  founderId: { type: Schema.Types.ObjectId, ref: 'users'},
  leadIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "users"
    }
  ],
  memberIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "users"
    }
  ],
  projectIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "projects"
    }
  ],
  requests: [RequestSchema]
});

const Team = mongoose.model("teams", teamSchema);
module.exports = Team;
