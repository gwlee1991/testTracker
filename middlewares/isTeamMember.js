const Team = require("../models/Team");
const ServerError = require("../Class/ServerError");

module.exports = async function (req, res, next) {
  const { teamId } = req.body;
  const { _id } = req.user;
  try {
    if (!teamId) {
      throw new ServerError(
        "Missing required parameter teamId",
        422,
        "INVALID_ENTRY"
      );
    }
  } catch (err) {
    res.status(err.statusCode).send({ code: err.code, message: err.message });
    return;
  }

  try {
    var team = await Team.findById(teamId);
  } catch (err) {
    res.status(422).send({ message: "No entry in database for teamId", code: 'NO_ENTRY_IN_DB' });
    return;
  }

  try {
    if (!team.leadIds.includes(_id) && !team.memberIds.includes(_id)) {
      throw new ServerError(
        "You need to be a member of the team",
        401,
        "UNAUTHORIZED_REQUEST"
      );
    }
    req.team = team;
    next();
  } catch (e) {
    if (e.code) {
      res.status(e.statusCode).send({ code: e.code, message: e.message });
    } else {
      res.status(401).send({
        code: "UNKNOWN_ERROR",
        message: "Unknown error has occurred.",
      });
    }
  }
};
