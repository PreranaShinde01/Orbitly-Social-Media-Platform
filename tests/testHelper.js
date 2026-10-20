process.env.NODE_ENV = 'test';
process.env.DISABLE_CSRF = 'true';

const request = require('supertest');
const app = require('../server');
const { getDb } = require('../src/db/connection');

function getAgent() {
  return request.agent(app);
}

module.exports = {
  app,
  getDb,
  getAgent
};
