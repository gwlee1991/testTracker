process.env.NODE_ENV = "test";

const User = require("../../models/User");
const Team = require("../../models/Team");
const AuthService = require("../../services/auth");

const bcrypt = require("bcrypt");
const chai = require("chai");
const expect = chai.expect;
const chaiHttp = require("chai-http");
const app = require("../../index");

chai.use(chaiHttp);
const url = "/api/team/edit";

const UNAUTHORIZED_REQUEST = "UNAUTHORIZED_REQUEST";

describe("/api/team/edit test cases", () => {
  before(async () => {
    await User.deleteMany({});
    await Team.deleteMany({});

    const name = "Test User";
    const email = "testemail@gmail.com";
    const isAdmin = true;
    const teamIds = [];
    const password = "tempPassword";
    const passwordDigest = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      isAdmin,
      passwordDigest,
      teamIds,
    });
    this.user = await user.save();

    const user2 = new User({
      name: "user2",
      email: "user2@email.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [],
    });

    this.user2 = await user2.save();

    const team1 = new Team({
      name: "Existing team",
      searchableName: "existingteam",
    });
    team1.leadIds.push(this.user._id);
    team1.founderId = this.user._id;

    const team2 = new Team({
      name: "Dup Team",
      searchableName: "dupteam",
    });

    this.team1 = await team1.save();
    this.team2 = await team2.save();
    this.user.teamIds.push(this.team1._id);
    this.user = await this.user.save();
    this.token = AuthService.generateToken(this.user);
  });

  it("should send error if not logged in", async () => {
    const request = chai.request(app).patch(url);
    const res = await request.send({
      teamId: this.team1._id,
      name: "New Team Name",
    });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if not team lead", async () => {
    const request = chai.request(app).patch(url);
    const user2Token = AuthService.generateToken(this.user2);
    request.set("Authorization", `Bearer ${user2Token}`);
    const res = await request.send({
      teamId: this.team1._id,
      name: "New Team Name",
    });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if invalid teamId is sent", async () => {
    const request = chai.request(app).patch(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: "dummy team id",
      name: "New Team Name",
    });

    expect(res.body.code).to.equal("INVALID_TEAM_ID");
  });

  it("should send error if there is a team with the same name already", async () => {
    const request = chai.request(app).patch(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team1._id,
      name: "Dup Team",
    });

    expect(res.body.code).to.equal('ENTRY_CONFLICT');
  });

  it("should change the team name if all is well", async () => {
    const request = chai.request(app).patch(url);
    request.set('Authorization', `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team1._id,
      name: "New Team Name"
    });

    expect(res.body.name).to.equal("New Team Name");
    expect(res.body.searchableName).to.equal("newteamname");
    expect(res.body.leadIds.length).to.equal(1);
    expect(res.body.memberIds.length).to.equal(0);
    expect(res.body.founderId).to.equal(this.user._id.toString());
  });
});
