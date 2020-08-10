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
const url = "/api/team/new";

describe("/api/team/new test cases", () => {
  before(async () => {
    await User.deleteMany({});
    await Team.deleteMany({});

    const name = "Test User";
    const email = "testemail@gmail.com";
    const isAdmin = true;
    const password = "tempPassword";
    const passwordDigest = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      isAdmin,
      passwordDigest
    });
    this.user = await user.save();
    this.token = AuthService.generateToken(user);

    const team = new Team({
      name: "Existing team",
      searchableName: "existingteam"
    });
    team.leadIds.push(this.user._id);
    team.founderId = this.user._id;
    this.team = await team.save();
  });

  it("should create team when all is well", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      name: "Viv Labs QA"
    });

    expect(res.body.team).to.have.property('_id');
    expect(res.body.team.leadIds).to.include(this.user._id.toString());
    expect(res.body.team.founderId).to.eql(this.user._id.toString());
    expect(res.body.user.teamIds[0]).to.equal(res.body.team._id);

    const searchRequest = chai
      .request(app)
      .get("/api/team/search?teamName=vivlabsqa")
      .set("Authorization", `Bearer ${this.token}`);
    const searchResponse = await searchRequest.send();

    expect(res.body.team._id).to.equal(searchResponse.body[0]._id);

    const userSearch = chai
      .request(app)
      .get(`/api/user/fetch?userId=${this.user._id.toString()}`);
    const userSearchResponse = await userSearch.send();

    expect(userSearchResponse.body.teams[0]._id).to.equal(
      res.body.team._id.toString()
    );
  });

  it("should not let user create team if not signed in", async () => {
    const request = chai.request(app).post(url);
    const res = await request.send({
      name: "Viv Labs QA2"
    });

    expect(res.statusCode).to.equal(404);
  });

  it("should send correct error when invalid parameters are sent", async () => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      teamName: "Viv Labs QA"
    });

    expect(res.statusCode).to.equal(422);
    expect(res.body.code).to.equal("INVALID_REQUEST");
  });
  
  it('should send error if duplicate name exists', async() => {
    const request = chai.request(app).post(url);
    request.set("Authorization", `Bearer ${this.token}`);
    const res = await request.send({
      name: "Existing team"
    });
    
    expect(res.statusCode).to.equal(409);
    expect(res.body.code).to.equal("ENTRY_CONFLICT");
  })
});
