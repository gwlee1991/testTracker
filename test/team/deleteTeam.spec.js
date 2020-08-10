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
const url = "/api/team/delete";

describe("/api/team/delete test cases", () => {
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

    const team = new Team({
      name: "Existing team",
      searchableName: "existingteam",
    });
    team.leadIds.push(this.user._id);
    team.founderId = this.user._id;

    this.team = await team.save();
    this.user.teamIds.push(this.team._id);
    this.user = await this.user.save();
    this.token = AuthService.generateToken(this.user);
  });

  it("only team leads should be able to delete team", async () => {
    const newUser = await new User({
      name: "Test User",
      email: "test2@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
    }).save();
    const newUserToken = AuthService.generateToken(newUser);
    const request = chai.request(app).delete(url);
    request.set("Authorization", `Bearer ${newUserToken}`);
    const res = await request.send({ teamId: this.team._id });

    expect(res.statusCode).to.equal(409);
  });

  it("should check for valid parameter", async () => {
    const request = chai.request(app).delete(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({ name: this.team.name });

    expect(res.statusCode).to.equal(422);
  });

  it("should be able to delete team", async () => {
    const request = chai.request(app).delete(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
    });

    expect(res.statusCode).to.equal(200);
    const team = await Team.findById(this.team._id);

    expect(team).to.be.null;

    const user = await User.findById(this.user._id);
    expect(user.teamIds).to.not.include(this.team._id.toString());
  });
});
