const mongoose = require('mongoose');
const { Schema } = mongoose;

const requestSchema = new Schema({
    requester: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    approved: {
        type: Boolean,
        default: false
    },
    team: {
        type: Schema.Types.ObjectId,
        ref: 'teams'
    },
    role: {
        type: String,
        required: true
    }
});

module.exports = requestSchema;