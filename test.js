'use strict';

const { join } = require('path');
const { promisify } = require('util');
const { expect } = require('chai');
const { mkdtemp, writeFile } = require('fs-promise');
const glob = promisify(require('glob'));
const { after, describe, it } = require('mocha');
const rimraf = promisify(require('rimraf'));
const relquire = require('.');

describe('relquire', () => {
  describe('.base', () => {
    it('is the root directory', () => {
      expect(relquire.base).to.equal(__dirname);
    });
  });
  describe('.resolve()', () => {
    it('returns a full path', () => {
      expect(relquire.resolve('~/test.js')).to.equal(__filename);
    });
  });
  describe('.desolve()', () => {
    it('returns a relative path', () => {
      expect(relquire.desolve(__filename)).to.equal('~/test.js');
    });
  });
  describe('.exports()', () => {
    after(async () => {
      for (let path of await glob('test-**')) {
        await rimraf(path);
      }
    });
    it('adds properties to module exports greedily ', async () => {
      const time = new Date().getTime();
      const dirname = await mkdtemp('test-');
      const module = { filename: join(dirname, 'index.js'), exports: {} };

      await writeFile(module.filename, '');
      await writeFile(`${join(dirname, 'time.js')}`, `module.exports = ${time}`);

      relquire.exports(module, false);
      expect(Object.keys(module.exports)).to.contain('time');
      expect(module.exports).to.eql({ time });
    });
    it('adds properties to module exports lazily', async () => {
      const time = new Date().getTime();
      const dirname = await mkdtemp('test-');
      const module = { filename: join(dirname, 'index.js'), exports: {} };

      await writeFile(module.filename, '');
      await writeFile(`${join(dirname, 'time.js')}`, `module.exports = ${time}`);

      relquire.exports(module, true);
      expect(Object.keys(module.exports)).to.not.contain('time');
      expect(module.exports).to.have.property('time').equal(time);
    });
  });
});
