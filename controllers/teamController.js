const Team = require("../models/Team");
const User = require("../models/User");
const ServerError = require("../Class/ServerError");

const unknownErrorCode = "UNKNOWN_ERROR";
const unknownErrorMessage = "Unknown Error has occurred";

const fetchTeam = async (req, res) => {
  try {
    if (!req.query.teamId)
      throw new ServerError("Missing parameter teamId", 422, "INVALID_ENTRY");
    var team = await Team.findById(req.query.teamId);
    if (!team)
      throw new ServerError("Could not find team", 404, "NO_ENTRY_IN_DB");
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ message: err.message, code: err.code });
    } else {
      res
        .status(404)
        .send({ message: "Could not find team", code: "NO_ENTRY_IN_DB" });
    }
    return;
  }

  try {
    let response;
    if (
      team.memberIds.includes(req.user._id) ||
      team.leadIds.includes(req.user._id)
    ) {
      response = await constructDetailTeamResponse(team, true);
    } else {
      response = await constructDetailTeamResponse(team, false);
    }
    res.send(response);
  } catch (err) {
    res
      .status(400)
      .send({ message: unknownErrorMessage, code: unknownErrorCode });
  }
};

const searchTeams = async (req, res) => {
  const { teamName, email } = req.query;
  if (teamName) var teamSearchable = teamName.toLowerCase().split(" ").join("");
  try {
    let response;
    if (teamName && !email) {
      const teams = await Team.find({
        searchableName: { $regex: teamSearchable, $options: "i" }
      });
      response = await constructTeamsResponse(teams);
    }

    if (!teamName && email) {
      const user = await User.findOne({ email });
      const teams = await Team.find({ _id: { $in: user.teamIds } });
      response = await constructTeamsResponse(teams);
    }

    if (teamName && email) {
      const user = await User.findOne({ email });
      const teams = await Team.find({ _id: { $in: user.teamIds } });
      const matchingTeams = teams.filter(
        (team) => team.searchableName.indexOf(teamSearchable) !== -1
      );
      response = await constructTeamsResponse(matchingTeams);
    }

    if (!teamName && !email) {
      throw new ServerError("Need valid entry to search.", 422, "INVALID_REQUEST");
    }

    res.send(response);
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ code: err.code, message: err.message });
    } else {
      res.status(400).send({ code: unknownErrorCode, message: unknownErrorMessage });
    }
  }
};

const createTeam = async (req, res) => {
  try {
    if (!req.body.name)
      throw new ServerError(
        "Missing required parameter: name",
        422,
        "INVALID_REQUEST"
      );
    const existingTeam = await Team.findOne({ name: req.body.name });
    if (existingTeam) {
      throw new ServerError(
        "The same team name already exists",
        409,
        "ENTRY_CONFLICT"
      );
    }
    let team = new Team({
      name: req.body.name,
      searchableName: req.body.name.toLowerCase().split(" ").join(""),
    });
    team.leadIds.push(req.user._id);
    team.founderId = req.user._id;
    team = await team.save();

    const user = await User.findById(req.user._id);
    user.teamIds.push(team._id);
    const newUser = await user.save();

    res.send({ team, user: newUser });
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ code: err.code, message: err.message });
    } else {
      res.status(400).send({
        code: unknownErrorCode,
        message: unknownErrorMessage,
      });
    }
  }
};

const deleteTeam = async (req, res) => {
  const team = req.team;
  try {
    var members = [...team.leadIds, ...team.memberIds];
    await Team.deleteOne({ _id: team._id });
  } catch (e) {
    res.status(404).send("Team could not be found.");
  }

  try {
    const users = await User.find().where("_id").all(members);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      user.teamIds.pull(team._id);
      await user.save();
    }

    res.status(200).send({});
  } catch (err) {
    res
      .status(400)
      .send({ message: unknownErrorMessage, code: unknownErrorCode });
  }
};

// available to team leads
const editTeam = async (req, res) => {
  const { teamId } = req.body;
  try {
    const team = await Team.findById(teamId);
    const existingTeam = await Team.find({ name: req.body.name });

    if (existingTeam.length > 0) {
      throw new ServerError("Existing team name.", 409, "ENTRY_CONFLICT");
    }

    if (req.body.name) {
      team.name = req.body.name;
      team.searchableName = req.body.name.split(" ").join("").toLowerCase();
    }

    const newTeam = await team.save();
    res.send(newTeam);
  } catch (e) {
    if (e.code) {
      res.status(e.statusCode).send({ message: e.message, code: e.code });
    } else {
      res
        .status(400)
        .send({ message: unknownErrorMessage, code: unknownErrorCode });
    }
  }
};

// available to team leads
const addTeamMembers = async (req, res) => {
  const team = req.team;
  const { members } = req.body;
  try {
    if (!members)
      throw new ServerError(
        "Missing members parameter",
        422,
        "INVALID_PARAMETER"
      );

    const emails = members.map((member) => member.email);
    const users = await User.find({ email: { $in: emails } });
    if (users.length === 0) {
      throw new ServerError(
        "Please enter correct email address(es)",
        422,
        "INVALID_PARAMETER"
      );
    }

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const user = users.filter((user) => user.email === member.email)[0];
      if (user._id == req.user._id)
        throw new ServerError(
          "You cannot invite yourself",
          422,
          "INVALID_REQUEST"
        );
      if (member.isLead && team.leadIds.indexOf(user._id) === -1) {
        team.leadIds.push(user._id);
      }
      if (!member.isLead && team.memberIds.indexOf(user._id) === -1) {
        team.memberIds.push(user._id);
      }
      if (user.teamIds.indexOf(team._id) === -1) {
        user.teamIds.push(team._id);
      }
      await user.save();
    }

    await team.save();
    res.send(team);
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ message: err.message, code: err.code });
    } else {
      res.status(400).send({
        message: unknownErrorMessage,
        code: unknownErrorCode,
      });
    }
  }
};

const fetchTeamMembers = async (req, res) => {
  try {
    const response = {};
    const founderInfo = await getUsersInfo([req.team.founderId]);
    response.founder = founderInfo[0];
    response.leads = await getUsersInfo(req.team.leadIds);
    response.members = await getUsersInfo(req.team.memberIds);
    res.send(response);
  } catch (err) {
    res
      .status(400)
      .send({ message: unknownErrorMessage, code: unknownErrorCode });
  }
};

const fetchTeamProjects = async (req, res) => {};

// available to team leads
const removeTeamMember = async (req, res) => {
  const { userId } = req.body;
  const { team, user } = req;
  try {
    if (userId == team.founderId) {
      throw new ServerError(
        "A founder cannot be removed from team",
        422,
        "INVALID_REQUEST"
      );
    }

    if (
      team.leadIds.includes(userId) &&
      team.founderId != userId &&
      userId != user._id &&
      user._id != team.founderId
    ) {
      throw new ServerError(
        "A team lead cannot remove another lead",
        422,
        "UNAUTHORIZED_REQUEST"
      );
    }

    if (
      team.memberIds.includes(userId) &&
      userId != user._id &&
      team.memberIds.includes(user._id)
    ) {
      throw new ServerError(
        "A member cannot remove another member from the team",
        422,
        "UNAUTHORIZED_REQUEST"
      );
    }

    if (team.memberIds.includes(user) && team.leadIds.includes(userId)) {
      throw new ServerError(
        "A team member cannot remove a lead",
        422,
        "UNAUTHORIZED_REQUEST"
      );
    }

    if (!team.leadIds.includes(userId) && !team.memberIds.includes(userId)) {
      throw new ServerError("User is not in team", 404, "NO_MATCHING_ENTITY");
    }

    if (team.leadIds.includes(userId)) {
      team.leadIds.pull(userId);
    } else {
      team.memberIds.pull(userId);
    }

    const removedUser = await User.findById(userId);
    removedUser.teamIds.pull(team._id);
    removedUser.save();
    const newTeam = await team.save();
    res.send(newTeam);
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ message: err.message, code: err.code });
    } else {
      res
        .status(400)
        .send({ message: unknownErrorMessage, code: unknownErrorCode });
    }
    return;
  }

  try {
    const user = await User.findById(userId);
    user.teamIds.pull(team._id);
    await user.save();
  } catch (err) {
    throw "There was an error updating the user";
  }
};

// available to team leads
const promoteMemberToLead = async (req, res) => {
  const { userId } = req.body;
  const { team } = req;
  try {
    if (team.leadIds.includes(userId)) {
      throw new ServerError("Cannot promote lead", 422, "INVALID_OPERATION");
    }

    if (!team.memberIds.includes(userId)) {
      throw new ServerError("User is not a member", 422, "INVALID_ENTITY");
    }

    team.memberIds.pull(userId);
    team.leadIds.push(userId);
    const newTeam = await team.save();

    res.send(newTeam);
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ message: err.message, code: err.code });
    } else {
      res
        .status(400)
        .send({ message: unknownErrorMessage, code: unknownErrorCode });
    }
  }
};

const demoteLeadToMember = async (req, res) => {
  const { team } = req;
  const { userId } = req.body;
  try {
    if (team.leadIds.length === 1 && team.leadIds[0] == req.user._id) {
      throw new ServerError(
        "You cannot demote yourself to team member when you are the only team lead.",
        422,
        "INVALID_REQUEST"
      );
    }

    if (userId == team.founderId)
      throw new ServerError(
        "Founder cannot be demoted",
        403,
        "INVALID_OPERATION"
      );

    if (!team.leadIds.includes(userId)) {
      throw new ServerError("User is not a lead", 422, "INVALID_ENTITY");
    }

    team.leadIds.pull(userId);
    team.memberIds.push(userId);
    const newTeam = await team.save();
    res.send(newTeam);
  } catch (err) {
    if (err.code) {
      res.status(err.statusCode).send({ message: err.message, code: err.code });
    } else {
      res
        .status(400)
        .send({ message: unknownErrorMessage, code: unknownErrorCode });
    }
  }
};

//helpers
const getUsersInfo = async (ids) => {
  const users = await User.find({ _id: { $in: ids } });
  return users.map((user) => {
    const { _id, email, name } = user;
    return { _id, email, name };
  });
};

const constructDetailTeamResponse = async (team, isTeamMember) => {
  const {
    _id,
    name,
    founderId,
    leadIds,
    memberIds,
    projectIds,
    requests,
  } = team;
  const founderInfo = await getUsersInfo([founderId]);
  const response = {
    _id,
    name,
    founder: founderInfo[0],
    projects: [],
    requests: [],
  };

  if (isTeamMember) {
    const leads = await getUsersInfo(leadIds);
    response.leads = leads;

    const members = await getUsersInfo(memberIds);
    response.members = members;
  }

  return response;
};

const constructTeamsResponse = async (teams) => {
  const newTeams = [];
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const { name, founderId, _id } = team;
    const founderInfo = await getUsersInfo([founderId]);
    newTeams.push({ _id, name, founder: founderInfo[0] });
  }
  return newTeams;
};

module.exports = {
  fetchTeam,
  searchTeams,
  createTeam,
  deleteTeam,
  editTeam,
  addTeamMembers,
  fetchTeamMembers,
  promoteMemberToLead,
  demoteLeadToMember,
  removeTeamMember,
};
