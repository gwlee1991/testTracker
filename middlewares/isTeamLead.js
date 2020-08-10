const Team = require("../models/Team");
const ServerError = require("../Class/ServerError");

module.exports = async function(req, res, next) {
  const { teamId } = req.body;
  const { _id } = req.user;

  if (!teamId) {
    res.status(422).send({ code: "INVALID_TEAM_ID", message: "Invalid teamId"});
    return;
  }
  
  try {
    var team = await Team.findById(teamId);
  } catch (err) {
    res.status(422).send({ code: 'INVALID_TEAM_ID', message: 'Invalid teamId'});
    return;
  }

  try {
    if (!team.leadIds.includes(_id)) {
      throw new ServerError(
        "You need to be a team lead",
        409,
        "UNAUTHORIZED_REQUEST"
      );
    }
    req.team = team;
    next();
  } catch (e) {
    if (e.code) {
      res.status(e.statusCode).send({ message: e.message, code: e.code });
    } else {
      res.status(400).send({ message: "Unknown error has occurred", code: "UNKNOWN_ERROR"});
    }
  }
};
