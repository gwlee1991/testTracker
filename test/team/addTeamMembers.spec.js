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
const url = "/api/team/members/add";

describe("/api/team/members/add test cases", () => {
  before(async function(){
    await User.deleteMany({});
    await Team.deleteMany({});

    const name = "Test User";
    const email = "testemail@gmail.com";
    const isAdmin = true;
    const password = "tempPassword";
    const teamIds = [];
    const passwordDigest = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      isAdmin,
      passwordDigest,
      teamIds
    });
    this.user = await user.save();
    this.token = AuthService.generateToken(user);
    
    const team = new Team({
      name: "Test team",
      searchableName: "testteam"
    });
    team.leadIds.push(this.user._id);
    team.founderId = this.user._id;

    this.team = await team.save();

    this.user.teamIds.push(this.team._id);
    this.user = await this.user.save();

    this.mockUsers = [
      {
        name: "test1",
        email: "test1@gmail.com",
        isAdmin: false,
        passwordDigest: "hi",
        teamIds: []
      },
      {
        name: "test2",
        email: "test2@gmail.com",
        isAdmin: false,
        passwordDigest: "hi",
        teamIds: []
      }
    ];
  });

  it("should add members when passed correct body", async function(){
    const users = await User.insertMany(this.mockUsers);
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      members: [
        { email: "test1@gmail.com", isLead: true },
        { email: "test2@gmail.com", isLead: false }
      ]
    });

    expect(res.statusCode).to.equal(200);
    expect(res.body.leadIds.length).to.equal(2);
    expect(res.body.memberIds).to.include(users[1]._id.toString());

    const user1 = await User.findById(users[0]._id.toString());
    const user2 = await User.findById(users[1]._id.toString());
    expect(user1.teamIds).to.include(this.team._id);
    expect(user2.teamIds).to.include(this.team._id);
  });

  it("should give correct error if teamId is invalid", async function(){
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: "dummyId",
      members: [
        { email: "test1@gmail.com", isLead: true },
        { email: "test2@gmail.com", isLead: false }
      ]
    });
    
    expect(res.body.code).to.equal("INVALID_TEAM_ID");
  });

  it("should give correct error message if no members are passed", async function(){
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id
    });

    expect(res.statusCode).to.equal(422);
    expect(res.body.code).to.equal("INVALID_PARAMETER");
  });

  it("should handle error when invalid emails are sent", async function(){
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      members: [
        {
          email: "dummy@gmail.com",
          isLead: false
        }
      ]
    });

    expect(res.statusCode).to.equal(422);
    expect(res.body.code).to.equal("INVALID_PARAMETER");
  });

  it("should not allow user to invite self", async function(){
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamId: this.team._id,
      members: [
        {
          email: this.user.email,
          isLead: false
        }
      ]
    });

    expect(res.statusCode).to.equal(422);
    expect(res.body.code).to.equal("INVALID_REQUEST");
  });
});
