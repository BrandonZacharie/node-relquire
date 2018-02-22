'use strict';

const Events = require('events');
const fs = require('fs');
const path = require('path');

/**
 * A regualr expression that matches path seperators.
 * @type {RegExp}
 */
const pathSepRegExp = /\/|\\/g;

/**
 * The current system path seperator.
 * @type {String}
 */
const SEP = path.sep;

/**
 * Get a fully qualified for a given relative path.
 * @argument {String} id
 * @argument {String} base
 * @return {String}
 */
const resolve = (id, base) =>
  id.indexOf('~/') !== 0 ? id : path.resolve(base, `.${id.substr(1)}`);

/**
 * Get the root directory of a module at a given path.
 * @argument {String|String[]} start
 * @return {String}
 */
const findBase = (start) => {
  start = start || module.parent.filename || module.filename;

  if (typeof start === 'string') {
    start = start.split(SEP);
  }

  start.pop();

  const path = start.join(SEP);

  return fs.existsSync(`${path}/package.json`)
    ? path
    : findBase(start);
};

const relquire = new Events;

/**
 * The current package root directory path.
 * @readonly
 * @type {String}
 */
relquire.base = findBase();

/**
 * The name of the current package root directory.
 * @readonly
 * @type {String}
 */
relquire.name = relquire.base.match(/.*(?:\/|\\)(.*)/)[1];

/**
 * Get a fully qualified path for a given `id`.
 * @argument {String} id
 * @return {String}
 */
relquire.resolve = (id) => resolve(id, relquire.base);

/**
 * Get a relative path for a given `id`.
 * @argument {String} id
 * @return {String}
 */
relquire.desolve = (id) => id.replace(relquire.base, '~');

/**
 * Add submodules as symbols to a given object.
 * @argument {Object} module
 * @argument {Boolean} useLazyGetter
 * @return {undefined}
 */
relquire.exports = (module, useLazyGetter) => {
  const moduleDirname = path.dirname(module.filename);
  const moduleBasename = path.basename(module.filename);

  for (let basename of fs.readdirSync(moduleDirname)) {
    if (basename === moduleBasename) {
      continue;
    }

    const filename = path.join(moduleDirname, basename);
    const stats = fs.statSync(filename);

    if (!(stats.isDirectory() || path.extname(basename) === '.js')) {
      continue;
    }

    basename = path.basename(basename, '.js');

    if (module.exports[basename] !== undefined) {
      const moduleNamePrefix = moduleDirname
        .replace(relquire.base, relquire.name)
        .replace(pathSepRegExp, '.');

      relquire.emit('clobber', { module: `${moduleNamePrefix}.${basename}` });
    }

    /**
     * Get the module for `filename`.
     * @return {Object}
     */
    const get = () =>
      require(filename);

    if (useLazyGetter) {
      Object.defineProperty(module.exports, basename, { get });
    }
    else {
      module.exports[basename] = get();
    }
  }
};

module.exports = relquire;
