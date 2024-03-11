const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const redisUrl = "redis://127.0.0.1:6379";
const redisClient = redis.createClient(redisUrl);

redisClient.get = util.promisify(redisClient.get);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function () {
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );
  // see if we have a value for 'key' in redis
  const cacheValue = await redisClient.get(key);

  if (cacheValue) {
    console.log("Serving from redis");
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc) ? doc.map(d => new this.model(d)) : new this.model(doc);
  }
  // if yes we return the value

  // if no we execute the query and cache the result
  
  const result = await exec.apply(this, arguments);
  
  redisClient.set(key, JSON.stringify(result));
  
  return result;
};
