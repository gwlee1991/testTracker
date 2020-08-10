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
const url = "/api/team/members/remove";

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

    this.lead1 = await new User({
      name: "user1",
      email: "user1@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.lead2 = await new User({
      name: "user2",
      email: "user2@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.member1 = await new User({
      name: "user3",
      email: "user3@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.member2 = await new User({
      name: "user4",
      email: "user4@gmail.com",
      isAdmin: false,
      passwordDigest: "hi",
      teamIds: [this.team._id],
    }).save();
    this.nonmember = await new User({
      name: "user5",
      passwordDigest: false,
      isAdmin: false,
      teamIds: [],
      email: "user5@gmaio.com",
    }).save();
    this.team.leadIds.push(this.lead1._id);
    this.team.leadIds.push(this.lead2._id);
    this.team.memberIds.push(this.member1._id);
    this.team.memberIds.push(this.member2._id);
    this.team = await this.team.save();
  });

  it("should send error if not team member", async () => {
    const mockToken = AuthService.generateToken(this.nonmember);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.member1._id,
    });

    expect(res.body.code).to.equal(UNAUTHORIZED_REQUEST);
  });

  it("should send error if not logged in", async () => {
    const request = chai.request(app).post(url);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.member1._id,
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

    expect(res.body.code).to.equal("NO_MATCHING_ENTITY");
  });

  it("should send error if invalid teamId is passed", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: "dummy team id",
      userId: this.member1._id,
    });

    expect(res.body.code).to.equal("NO_ENTRY_IN_DB");
  });

  it("should send error if lead is attempted to be removed by another lead", async () => {
    const mockToken = AuthService.generateToken(this.lead1);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.lead2._id,
    });

    expect(res.body.code).to.equal("UNAUTHORIZED_REQUEST");
  });

  it("should send error if lead tries to remove founder", async () => {
    const mockToken = AuthService.generateToken(this.lead1);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.user._id,
    });

    expect(res.body.code).to.equal("INVALID_REQUEST");
  });

  it("should not let a member remove another member", async () => {
    const mockToken = AuthService.generateToken(this.member1);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.member2._id,
    });

    expect(res.body.code).to.equal("UNAUTHORIZED_REQUEST");
  });

  it("should let lead remove member when all is well", async () => {
    const mockToken = AuthService.generateToken(this.lead2);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.member2._id,
    });

    expect(res.body.memberIds.length).to.equal(1);
    expect(res.body.memberIds).to.not.include(this.member2._id.toString());
  });

  it("should let founder remove lead", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.lead2._id,
    });

    expect(res.body.leadIds.length).to.equal(2);
    expect(res.body.leadIds).to.not.include(this.lead2._id.toString());
  });

  it("should let member remove self from team", async () => {
    const mockToken = AuthService.generateToken(this.lead1);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.lead1._id,
    });

    expect(res.body.leadIds).to.not.include(this.lead1._id.toString());
  });

  it("should let lead remove self from team", async () => {
    const mockToken = AuthService.generateToken(this.member1);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${mockToken}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.member1._id,
    });

    expect(res.body.memberIds).to.not.include(this.member1._id.toString());
  });

  it("should not let founder remove self from team", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      userId: this.user._id,
    });

    expect(res.body.code).to.equal("INVALID_REQUEST");
  });
});
