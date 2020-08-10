const userController = require('../controllers/userController');

module.exports = (app) => {
  app.get('/api/user/fetch', userController.fetchUser);
}