const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const redisUrl = "redis://127.0.0.1:6379";
const redisClient = redis.createClient(redisUrl);

redisClient.hget = util.promisify(redisClient.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");



  return this;
};

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );
  // see if we have a value for 'key' in redis
  const cacheValue = await redisClient.hget(this.hashKey, key);

  // if yes we return the value
  if (cacheValue) {
    console.log("Serving from redis");
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }

  // if no we execute the query and cache the result
  const result = await exec.apply(this, arguments);
  redisClient.hset(this.hashKey, key, JSON.stringify(result), "EX", 10);

  return result;
};

module.exports = {
  clearHash(hashKey) {
    redisClient.del(JSON.stringify(hashKey));
  }
}