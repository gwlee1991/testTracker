const User = require("../models/User");
const Team = require("../models/Team");
const ServerError = require("../Class/ServerError");

const fetchUser = async (req, res) => {
  try {
    if (req.query.userId) {
      var user = await User.findById(req.query.userId);
    } else if (req.query.email) {
      var user = await User.find({ email: req.query.email });
    } else {
      throw new ServerError("Invalid parameters", 422, "INVALID_REQUEST");
    }
    if (!user) throw new ServerError("Invalid User Id", 422, "INVALID_ENTRY");
    const { _id, email, name, teamIds, isAdmin } = user;
    const teams = await getTeamsDetail(teamIds);
    res.send({ _id, email, name, teams, isAdmin });
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ code: err.code, message: err.message });
    } else {
      res.status(400).send({
        code: "UNKNOWN_ERROR",
        message: "Unknown error has occurred."
      });
    }
  }
};

const fetchUserTeams = async (req, res) => {};

const fetchUsers = async (req, res) => {};

// if change email, need to issue new jwt
const editUser = async (req, res) => {};

const deleteUser = async (req, res) => {};

const leaveTeam = async (req, res) => {};

//helper

const getTeamsDetail = async teamIds => {
  const teams = await Team.find({ _id: { $in: teamIds } });
  return teams.map(team => {
    const { _id, name, founderId } = team;
    return { _id, name, founderId };
  });
};

module.exports = {
  fetchUser
};
