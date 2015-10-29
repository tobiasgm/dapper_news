var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema({
    body: String,
    author: String,
    upvotes: {type: Number, default: 0},
    downvotes: {type: Number, default: 0},
    usersUpvoted: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    usersDownvoted: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }
});

CommentSchema.methods.upvote = function(user, cb) {
    if (this.usersUpvoted.indexOf(user._id) == -1) {
        this.usersUpvoted.push(user._id);
        this.upvotes++;
        if (this.usersDownvoted.indexOf(user._id) != -1) {
            this.usersDownvoted.splice(this.usersDownvoted.indexOf(user._id), 1);
            this.downvotes--;
        }
        this.save(cb);
    } else {
        this.save(cb);
    }
};

CommentSchema.methods.downvote = function(user, cb) {
    if (this.usersDownvoted.indexOf(user._id) == -1) {
        this.usersDownvoted.push(user._id);
        this.downvotes++;
        if (this.usersUpvoted.indexOf(user._id) != -1) {
            this.usersUpvoted.splice(this.usersUpvoted.indexOf(user._id), 1);
            this.upvotes--;
        }
        this.save(cb);
    }
    else {
        this.save(cb);   
    }
};

mongoose.model('Comment', CommentSchema);
