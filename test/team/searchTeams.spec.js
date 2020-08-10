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
const url = "/api/team/search";

const UNAUTHORIZED_REQUEST = "UNAUTHORIZED_REQUEST";

describe("/api/team/members/remove test cases", () => {
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

    this.team1 = await new Team({
      name: "Existing team",
      searchableName: "existingteam",
      leadIds: [this.user._id],
      founderId: this.user._id,
    }).save();

    this.team2 = await new Team({
      name: "Existingt Eam",
      searchableName: "existingteam",
      leadIds: [this.user._id],
      founderId: this.user._id,
    }).save();

    this.team3 = await new Team({
      name: "Team",
      searchableName: "team",
      leadIds: [this.user._id],
      founderId: this.user._id,
    }).save();

    this.user.teamIds.push(this.team1._id);
    this.user.teamIds.push(this.team2._id);
    this.user.teamIds.push(this.team3._id);
    this.user = await this.user.save();
    this.token = AuthService.generateToken(this.user);
  });

  it("should send error if not logged in", async () => {
    const endpoint = `${url}?teamName=Existing`;
    const request = chai.request(app).get(endpoint);
    const res = await request.send();

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if team name and email both are not passed correctly", async () => {
    const request = chai.request(app).get(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send();

    expect(res.body.code).to.equal("INVALID_REQUEST");
  });

  it("should send matching teams if team name is passed", async () => {
    const endpoint = `${url}?teamName=Existing`;
    const request = chai.request(app).get(endpoint);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send();

    expect(res.body.length).to.equal(2);
    expect(res.body[0].leadIds).to.be.undefined;
  });

  it("should send matching teams if only email is sent", async () => {
    const endpoint = `${url}?email=testemail@gmail.com`;
    const request = chai.request(app).get(endpoint);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send();

    expect(res.body.length).to.equal(3);
    expect(res.body[0].memberIds).to.be.undefined;
  });

  it("should send matching team if both email and teamName is sent", async () => {
    const endpoint = `${url}?email=testemail@gmail.com&teamName=Exist`;
    const request = chai.request(app).get(endpoint);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send();

    expect(res.body.length).to.equal(2);
  });
});
