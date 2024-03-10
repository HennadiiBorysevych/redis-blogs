const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');

const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    
    const redis = require('redis');
    const util = require('util');
    const redisUrl = 'redis://127.0.0.1:6379';
    const redisClient = redis.createClient(redisUrl);
    redisClient.get = util.promisify(redisClient.get);

    // Do we have amy cached data in redis related to this query?
    const cachedBlogs = await redisClient.get(eq.user.id);
    
    // if yes we serve it from redis
    if (cachedBlogs) {
      console.log('Serving from redis');
      res.send(JSON.parse(cachedBlogs));
      return;
    }
    
    // if no we do the query  
    const blogs = await Blog.find({ _user: req.user.id });
    console.log('Serving from mongo');
    res.send(blogs);

    redisClient.set(req.user.id, JSON.stringify(blogs));
    redisClient.expire(req.user.id, 300);
  });

  app.post('/api/blogs', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
