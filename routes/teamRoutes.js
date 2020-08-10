const teamController = require('../controllers/teamController');
const auth = require('../middlewares/auth');
const isTeamLead = require('../middlewares/isTeamLead');
const isTeamMember = require('../middlewares/isTeamMember');

module.exports = (app) => {
    app.get('/api/team', auth, teamController.fetchTeam);
    app.get('/api/team/search', auth, teamController.searchTeams);
    app.post('/api/team/members/fetch', auth, isTeamMember, teamController.fetchTeamMembers);
    app.post('/api/team/new', auth, teamController.createTeam);
    app.delete('/api/team/delete', auth, isTeamLead, teamController.deleteTeam);
    app.patch('/api/team/edit', auth, isTeamLead, teamController.editTeam);
    app.post('/api/team/members/add', auth, isTeamLead, teamController.addTeamMembers);
    app.post('/api/team/members/promote', auth, isTeamLead, teamController.promoteMemberToLead);
    app.post('/api/team/members/demote', auth, isTeamLead, teamController.demoteLeadToMember);
    app.post('/api/team/members/remove', auth, isTeamMember, teamController.removeTeamMember);
}