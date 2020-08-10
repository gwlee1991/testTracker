const mongoose = require('mongoose');
const { Schema } = mongoose;

const projectSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: 'teams'
    },
    name: String,
    
});

const Project = mongoose.model('projects', projectSchema);
module.exports = Project;