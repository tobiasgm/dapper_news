//Here we've defined a model called Post with several attributes corresponding to the type of data we'd like to store. We've declared our upvotes field to be initialized to 0 and we've set our comments field to an array of Comment references. This will allow us to use Mongoose's build in [populate()]mongoose populate method to easily retrieve all comments associated with a given post.

//In Mongoose, we can create relationships between different data models using the ObjectId type. The ObjectId data type refers to a 12 byte MongoDB ObjectId, which is actually what is stored in the database. The ref property tells Mongoose what type of object the ID references and enables us to retrieve both items simultaneously.

var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
    title: String,
    link: String,
    author: String,
    upvotes: {type: Number, default: 0},
    downvotes: {type: Number, default: 0},
    usersUpvoted: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    usersDownvoted: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});

PostSchema.methods.upvote = function(user, cb) {
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

PostSchema.methods.downvote = function(user, cb) {

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

mongoose.model('Post', PostSchema);
