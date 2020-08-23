'use strict'
const debug = require('debug')('hashicorp-vault-api')
const _ = require('lodash')
const EventEmitter = require('events')
const got = require('got')

class VaultApi extends EventEmitter {
  constructor (options) {
    _.defaultTo(options, {})
    _.defaults(options, { url: 'http://localhost:8200', version: 'v1', auth: {} })
    if (_.isString(_.get(options, 'keys')) === true) {
      options.keys = [options.keys]
    }
    super(options)
    const self = this
    Object.defineProperty(self, '_', { enumerable: false, value: { } })
    self._.config = {}
    self._.config.url = _.get(options, 'url')
    self._.config.version = _.get(options, 'version')
    self._.config.keys = _.defaultTo(_.get(options, 'keys'), [])
    self._.config.auth = {}
    self._.config.auth.type = _.defaultTo(_.get(options, 'auth.type'), 'token')
    self._.config.auth.path = _.defaultTo(_.get(options, 'auth.path'), '')
    self._.config.auth.payload = _.defaultTo(_.get(options, 'auth.payload'), '')
    const vaultUrl = `${self._.config.url}/${self._.config.version}`
    self._.got = got.extend({ prefixUrl: vaultUrl, responseType: 'json', throwHttpErrors: false })
    self._.spec = {}
    self.api = {}
  }

  get spec () {
    const self = this
    return self._.spec
  }

  async getOpenApiSpec () {
    const self = this
    debug('Getting open api spec from')
    self._.spec = await self.gotUrlWrapper('get', 'sys/internal/specs/openapi')
    return self._.spec
  }

  async init () {
    const self = this
    debug('Start initialization')
    let health = await self.health()
    const keys = _.defaultTo(_.get(self, '_.config.keys'), [])
    if (keys.length > 0 && health.sealed === true) {
      debug('Unsealing vault with the provided keys')
      for (const unsealKey of keys) {
        await self._.got.put('sys/unseal', { json: { key: unsealKey } })
      }
      health = await self.health()
      if (health.sealed === true) {
        debug('Failed to unseal vault')
        throw new Error('Unable to unseal vault with provided keys')
      } else {
        debug('Successfully unsealed vault with the provided keys')
      }
    }
    await self.auth()

    debug('Finished initialization')
    return _.get(self, '_.got.defaults.options.headers.x-vault-token')
  }

  /**
   *
   *
   * @param {String} method - the method to use when communicating with the endpoint
   * @param {String} url - the endpoint that you are calling
   * @param {Object} params - additional parameters to be provided to the endpoint
   * @param {Object} payload - the data to be sent to the endpoint
   * @returns {Object}
   * @memberof VaultApi
   */
  async request (method, url, params, payload) {
    const self = this
    const response = await self.gotUrlWrapper(method, url, params, payload)
    self.validateResponse(response)
    return response.body
  }

  validateResponse (response) {
    debug(`Validating response for path: ${response.path}, status code: ${response.statusCode}`)
    if (response.statusCode < 200 || response.statusCode > 299) {
      throw new Error(JSON.stringify(response.body))
    }
    if (_.isArray(_.get(response, 'body.errors')) === true) {
      debug(`Found an errors array: '${JSON.stringify(response.body.errors)}' in body. This is typically from a malformed url. ${response.path}`)
      throw new Error(`${response.path} returned a valid status code: ${response.statusCode} however the body is reporting errors present. ${response.body || ''}`)
    }
    return response
  }

  /**
   *
   * @description - Calls the /sys/health endpoint and always returns the body.
   * @returns {Object}
   * @memberof VaultApi
   */
  async health () {
    const self = this
    const got = self._.got
    debug('Requesting system health')
    const response = await got.get('sys/health')
    debug('Finished requesting system health')
    return response.body
  }

  async auth (options) {
    const self = this
    const authType = _.defaultTo(_.get(options, 'type'), _.get(self, '_.config.auth.type'))
    const authPath = _.defaultTo(_.get(options, 'path'), _.get(self, '_.config.auth.path'))
    const authPayload = _.defaultTo(_.get(options, 'payload'), _.get(self, '_.config.auth.payload'))
    _.set(self, '_.config.auth.type', authType)
    _.set(self, '_.config.auth.path', authPath)
    _.set(self, '_.config.auth.payload', authPayload)
    const health = await self.health()
    if (health.initialized === false || health.sealed === true) {
      throw new Error(`Vault is initalized: ${health.initialized}, sealed: ${health.sealed}`)
    }
    if (_.isString(authType) === true) {
      if (_.toLower(authType) === 'token') {
        debug('Found auth type of token. Skipping the token creation step typically required.')
        _.set(self, '_.config.auth.type', 'token')
        self._.got = self._.got.extend({ headers: { 'X-Vault-Token': authPayload } })
      } else {
        debug(`Starting the token creation for auth type: ${authType}`)
        let authUrl = `auth/${authType}/login`
        if (_.isString(authPath) === true && authPath !== '') {
          authUrl += `/${authPath}`
        }
        const authResponse = await self._.got.post(authUrl, { json: authPayload })
        self._.got = self._.got.extend({ headers: { 'X-Vault-Token': _.get(authResponse, 'body.auth.client_token') } })
      }
    }
    return self._.got.defaults.options.headers
  }

  /**
   *
   *
   * @param {String} method
   * @param {String} url
   * @param {Object} params
   * @param {Object} payload
   * @returns
   * @memberof VaultApi
   */
  async gotUrlWrapper (method, url, params, payload) {
    const self = this
    const got = self._.got
    if (url.indexOf('/') === 0) {
      url = url.substr(1)
    }
    const response = await got(url, { method, searchParams: params, json: payload })
    self.validateResponse(response)
    return response
  }

  /**
   *
   *
   * @param {String} mountPoint - the mountpoint of the secret engine to be updated
   * @param {String} path - the path on the mountpoint you want to updated
   * @param {Object} payload - the data to be merged with the existing data
   * @returns {Object}
   * @memberof VaultApi
   */
  async patch (mountPoint, path, payload) {
    const self = this
    const readResponse = await self.read(mountPoint, path)
    const exisitingData = _.get(readResponse, 'data.data')
    _.merge(payload, exisitingData)
    return self.write(mountPoint, path, payload)
  }

  /**
   *
   *
   * @param {String} mountPoint - the mountpoint of the secret engine to be updated
   * @param {String} path - the path on the mountpoint you want to updated
   * @param {Object} payload - the data to be written at the path, overwrites any data that currently exists
   * @returns {Object}
   * @memberof VaultApi
   */
  async write (mountPoint, path, payload) {
    const self = this
    let urlToUse = mountPoint
    debug(`Writing to: ${mountPoint} -> ${path}`)
    path = _.defaultTo(path, '')
    if (path.indexOf('data') === -1) {
      path = `data/${path}`
    }
    if (_.isString(path) === true && path !== '') {
      urlToUse += `/${path}`
    }
    const response = await self.gotUrlWrapper('post', urlToUse, {}, { data: payload })
    self.validateResponse(response)
    return response.body
  }

  /**
   *
   *
   * @param {String} mountPoint - the mountpoint of the secret engine
   * @param {String} path - the path on the mountpoint you want to deleted
   * @returns {Object}
   * @memberof VaultApi
   */
  async delete (mountPoint, path) {
    const self = this
    let urlToUse = mountPoint
    debug(`Deleting at: ${mountPoint} -> ${path || ''}`)
    path = _.defaultTo(path, '')
    if (path.indexOf('data') === -1) {
      path = `data/${path}`
    }
    if (_.isString(path) === true && path !== '') {
      urlToUse += `/${path}`
    }
    const response = await self.gotUrlWrapper('delete', urlToUse)
    self.validateResponse(response)
    return response.body
  }

  /**
   *
   *
   * @param {String} mountPoint - the mountpoint of the secret engine to be read
   * @param {String} path - the path on the mountpoint to be read
   * @param {Object} params - any additional paramaters to be provided in the url to the endpoint
   * @returns {Object}
   * @memberof VaultApi
   */
  async read (mountPoint, path, params) {
    const self = this
    let urlToVisit = mountPoint
    path = _.defaultTo(path, '')
    if (path.indexOf('metadata') === -1 && path.indexOf('data') === -1) {
      if (_.isUndefined(_.get(params, 'list')) === true) {
        path = `data/${path}`
      }
    }
    if (_.isString(path) === true && path !== '') {
      urlToVisit += `/${path}`
    }
    const response = await self.gotUrlWrapper('get', urlToVisit, params)
    return response.body
  }

  /**
   *
   * @description Calls the vault api and lists the metadata associated with the mountPoint and path
   * @param {String} mountPoint - the mountpoint of the secret engine to be listed
   * @param {String} path - the path on the mountpoint to be listed
   * @param {Object} params - any additional paramaters to be provided in the url to the endpoint
   * @returns {Object}
   * @memberof VaultApi
   */
  async list (mountPoint, path = '') {
    const self = this
    if (path.indexOf('metadata/') === -1) {
      path = `metadata/${path}`
    }
    return self.read(mountPoint, path, { list: true })
  }
}
module.exports = VaultApi
