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
const url = "/api/team/members/fetch";

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
      name: "User2",
      email: "user2@email.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [],
    });
    const user3 = new User({
      name: 'User3',
      email: 'user3@gmail.com',
      isAdmin: false,
      passwordDigest: 'hi',
      teamIds: [],
    });
    this.user2 = await user2.save();
    this.user3 = await user3.save();

    const team = new Team({
      name: "Existing team",
      searchableName: "existingteam",
    });
    team.leadIds.push(this.user._id);
    team.founderId = this.user._id;
    team.memberIds.push(this.user2._id);
    team.memberIds.push(this.user3._id);

    this.team = await team.save();
    this.user.teamIds.push(this.team._id);
    this.user2.teamIds.push(this.team._id);
    this.user3.teamIds.push(this.team._id);
    this.user = await this.user.save();
    this.user2 = await this.user2.save();
    this.user3 = await this.user3.save();
    this.token = AuthService.generateToken(this.user);
  });

  it("should send error if not logged in", async () => {
    const request = chai.request(app).post(url);
    const res = await request.send({ teamId: this.team._id });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if teamId is not passed", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({});

    expect(res.body.code).to.equal("INVALID_ENTRY");
  });

  it("should send error if no team matches the teamId", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({ teamId: 'dummy_id' });

    expect(res.body.code).to.equal("NO_ENTRY_IN_DB");
  });

  it("should send team member's detailed info when all is well", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({ teamId: this.team._id });
    
    expect(res.body.founder._id).to.equal(this.user._id.toString());
    expect(res.body.leads[0].email).to.equal(this.user.email);
    expect(res.body.members.length).to.equal(2);
  });
});
