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
const url = "/api/team/members/demote";

const UNAUTHORIZED_REQUEST = "UNAUTHORIZED_REQUEST";

describe("/api/team/members/demote test cases", () => {
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

    this.mockUser1 = await new User({
      name: "user1",
      email: "user1@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.mockUser2 = await new User({
      name: "user2",
      email: "user2@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.team.leadIds.push(this.mockUser1._id);
    this.team.memberIds.push(this.mockUser2._id);
    this.team = await this.team.save();
  });

  it("should send error if not team lead", async () => {
    const mockToken = AuthService.generateToken(this.mockUser2);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.mockUser1._id,
    });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if not logged in", async () => {
    const request = chai.request(app).post(url);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.mockUser1._id,
    });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if invalid userId is passed", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: "dummy_id",
    });

    expect(res.body.code).to.equal("INVALID_ENTITY");
  });

  it("should send error if invalid teamId is passed", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: "dummy team id",
      userId: this.mockUser1._id,
    });

    expect(res.body.code).to.equal("INVALID_TEAM_ID");
  });

  it("should send error if founder is attempted to be demoted", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.user._id,
    });

    expect(res.body.code).to.equal("INVALID_OPERATION");
  });

  it("should demote lead to member when all is well", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.mockUser1._id,
    });

    expect(res.body.leadIds).to.not.include(this.mockUser1._id.toString());
    expect(res.body.memberIds.length).to.equal(2);
  });
});
