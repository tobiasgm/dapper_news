var express = require('express');
var router = express.Router();
// We need to make sure that mongoose is imported and that we have handles to the Post and Comment models.
var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var passport = require('passport');
var User = mongoose.model('User');
var jwt = require('express-jwt');
var auth = jwt({secret: 'SECRET', userProperty: 'payload'});

// Then we use the express get() method to define the URL for the route (/posts) and a function to handle the request. Inside our request handler, we query the database for all posts. If and error occurred, we pass the error to an error handling function otherwise we use res.json() to send the retrieved posts back to the client.
// {info} When defining routes with Express.js, two variables will get passed to the handler function. req, which stands for "request", contains all the information about the request that was made to the server including data fields. res, which stands for "response", is the object used to respond to the client.

// GET all posts. Return a JSON list containing all posts
router.get('/posts', function(req, res, next) {
    Post.find(function(err, posts){
        if(err){ return next(err); }
        res.json(posts);
    });
});

// POST - register user
router.post('/register', function(req, res, next) {
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({message: 'Please fill out all fields'});
    } 
    var user = new User();
    user.username = req.body.username;
    user.setPassword(req.body.password)
    user.save(function (err){
        if(err){ return next(err); }
        return res.json({token: user.generateJWT()})
    });
});

// POST - login user
router.post('/login', function(req, res, next){
    if(!req.body.username || !req.body.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }
    
    passport.authenticate('local', function(err, user, info){
        if(err){ return next(err); }
        
        if(user){
            return res.json({token: user.generateJWT()});
        } else {
            return res.status(401).json(info);
        }
    })(req, res, next);
});

// POST - new post
router.post('/posts', auth, function(req, res, next) {
    // new mongoose Post object
    var post = new Post(req.body);    
    post.author = req.payload.username;  
    // save post
    post.save(function(err, post){
        if(err){ return next(err); }
        res.json(post);
    });
});

// Rather than replicating the same code across several different request handler functions,
// we can use Express's param() function to automatically load an object.
// PARAM - preload post objects
router.param('post', function(req, res, next, id) {
    // In this example we are using mongoose's query interface which simply provides a more flexible way of interacting with the database.
    var query = Post.findById(id);
    
    query.exec(function (err, post){
        if (err) { return next(err); }
        if (!post) { return next(new Error('can\'t find post')); }     
        req.post = post;
        return next();
    });
});

// Rather than replicating the same code across several different request handler functions,
// we can use Express's param() function to automatically load an object.
// PARAM - preload comment objects
router.param('comment', function (req, res, next, id) {
    var query = Comment.findById(id);
    
    query.exec(function (err, comment) {
	if (err) { return next(err); }
	if (!comment) { return next(new Error("can't find comment")); }	
	req.comment = comment;
	return next();
    });
});

// Now when we define a route URL with :post in it, this function will be run first. Assuming the :post parameter contains an ID, our function will retrieve the post object from the database and attach it to the req object after which the route handler function will be called.

// GET - single post
router.get('/posts/:post', function(req, res, next) {
    // Use the populate() function to retrieve comments along with posts:
    req.post.populate('comments', function(err, post) {
        if (err) { return next(err); }     
        res.json(post);
    });
});

// Upvote post
router.put('/posts/:post/upvote', auth, function(req, res, next) {
    req.post.upvote(req.payload, function(err, post){
        if (err) { return next(err); }
        res.json(post);
    });
});

// Downvote post
router.put('/posts/:post/downvote', auth, function(req, res, next) {
    req.post.downvote(req.payload, function(err, post){
        if (err) { return next(err); }
        res.json(post);
    });
});

// POST new comment
router.post('/posts/:post/comments', auth, function(req, res, next) {
    
    var comment = new Comment(req.body);
    // Firstly, when creating a new comment we need to be sure to include the post ID. Fortunately, this is already implicitly included in the request.
    comment.post = req.post;
    comment.author = req.payload.username;
    
    comment.save(function(err, comment){
        if(err){ return next(err); }
        // In addition to creating and saving the comment, we're going to need to attach a reference to the new comment that refers to our post object.
        req.post.comments.push(comment);
        req.post.save(function(err, post) {
            if(err){ return next(err); }          
            res.json(comment);
        });
    });
});

// Upvote comment
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
    req.comment.upvote(req.payload, function (err, comment) {
	if (err) { return next(err); }	
	res.json(comment);
    });
});

// Downvote comment
router.put('/posts/:post/comments/:comment/downvote', auth, function(req, res, next) {
    req.comment.downvote(req.payload, function(err, comment){
        if (err) { return next(err); }
        res.json(comment);
    });
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

module.exports = router;
