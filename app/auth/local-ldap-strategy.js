/**
 * Classification: UNCLASSIFIED
 *
 * @module  auth.local-ldap-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Implements a hybrid authentication strategy that uses
 * local and/or ldap authentication based on the user's "provider" field.
 */

// Expose auth strategy functions
// Note: The export is being done before the import to solve the issues of
// circular references.
module.exports = {
  handleBasicAuth,
  handleTokenAuth,
  doLogin
};

// MBEE modules
const LocalStrategy = M.require('auth.local-strategy');
const LDAPStrategy = M.require('auth.ldap-strategy');
const User = M.require('models.user');

/**
 * @description Handles basic-style authentication. This function gets called both for
 * the case of a basic auth header or for login form input. Either way
 * the username and password is provided to this function for auth.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {String} username - Username authenticate via locally or LDAP AD
 * @param {String} password - Password to authenticate via locally or LDAP AD
 * @return {Promise} resolve - authenticated user object
 *                   reject - an error
 */
function handleBasicAuth(req, res, username, password) {
  return new Promise((resolve, reject) => {
    // Search locally for the user
    User.find({
      username: username,
      deletedOn: null
    })
    .populate('orgs.read orgs.write orgs.admin proj.read proj.write proj.admin')
    .exec((findUserErr, users) => {
      // Check for errors
      if (findUserErr) {
        return reject(findUserErr);
      }
      // If user found and their provider is local,
      // do local authentication
      if (users.length === 1 && users[0].provider === 'local') {
        LocalStrategy.handleBasicAuth(req, res, username, password)
        .then(localUser => resolve(localUser))
        .catch(localErr => reject(localErr));
      }

      // User is not found locally
      // or is found and has the LDAP provider,
      // try LDAP authentication
      else if (users.length === 0 || (users.length === 1 && users[0].provider === 'ldap')) {
        LDAPStrategy.handleBasicAuth(req, res, username, password)
        .then(ldapUser => resolve(ldapUser))
        .catch(ldapErr => reject(ldapErr));
      }
      else {
        // More than 1 user found or provide not set to ldap/local
        return reject(new M.CustomError('More than one user found or invalid provider.'));
      }
    });
  });
}

/**
 * @description This function implements handleTokenAuth called in the auth.js library file.
 * The purpose of this function is to implement authentication of a user who has
 * passed in a session token or bearer token. This particular instance just implements the same
 * tokenAuth provided by the Local Strategy.
 *
 * @param {Object} req - Request object from express
 * @param {Object} res - Response object from express
 * @param {String} _token -  Token user is attempting to authenticate with.
 * @returns {Promise} resolve - token authenticated user object
 *                    reject - an error
 *
 * @example
 * AuthController.handleTokenAuth(req, res, _token)
 *   .then(user => {
 *   // do something with authenticated user
 *   })
 *   .catch(err => {
 *     console.log(err);
 *   })
 */
function handleTokenAuth(req, res, _token) {
  return new Promise((resolve, reject) => {
    LocalStrategy.handleTokenAuth(req, res, _token)
    .then(user => resolve(user))
    .catch(handleTokenAuthErr => reject(handleTokenAuthErr));
  });
}

/**
 * @description This function implements doLogin called in the auth.js library file.
 * The purpose of this function is to preform session or token setup for the node
 * application so that users can be authorized via token after logging in. This particular
 * implementation uses the Local Strategy doLogin function.
 *
 * @param {Object} req - Request object from express
 * @param {Object} res - Response object from express
 * @param {callback} next - Callback to express authentication flow
 */
function doLogin(req, res, next) {
  LocalStrategy.doLogin(req, res, next);
}