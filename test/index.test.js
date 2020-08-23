'use strict'
/* eslint-disable no-undef */
const debug = require('debug')('hashicorp-vault-api')
const _ = require('lodash')
const fixtures = require('./fixtures.json')
const VaultApi = require('..')
const { expect } = require('chai')

const VAULT_ADDR = _.get(process, 'env.VAULT_ADDR')
const VAULT_SEAL = _.get(process, 'env.VAULT_SEAL')
describe('hashicorp-vault-api', () => {
  const credentailKeys = _.keys(_.get(fixtures, 'vault.auth'))
  for (const credentialKey of credentailKeys) {
    const vaultTestCredentials = _.get(fixtures, `vault.auth.${credentialKey}`)
    _.set(vaultTestCredentials, 'url', _.defaultTo(VAULT_ADDR, _.get(vaultTestCredentials, 'url')))
    _.set(vaultTestCredentials, 'keys', _.defaultTo(VAULT_SEAL, _.get(vaultTestCredentials, 'keys')))
    const vault = new VaultApi(vaultTestCredentials)
    describe(`validating auth type: ${credentialKey}`, () => {
      describe('#init', () => {
        it('should assign a value to the appropriate header value', async () => {
          const response = await vault.init()
          expect(response).to.be.an('string')
        })
      })
      describe('#health', () => {
        it('should be allowed to return a health check', async () => {
          const healthCheck = await vault.health()
          expect(healthCheck).to.be.an('object')
          expect(healthCheck).to.haveOwnProperty('initialized')
          expect(healthCheck).to.haveOwnProperty('sealed')
          expect(healthCheck).to.haveOwnProperty('standby')
          expect(healthCheck).to.haveOwnProperty('performance_standby')
          expect(healthCheck).to.haveOwnProperty('replication_performance_mode')
          expect(healthCheck).to.haveOwnProperty('replication_dr_mode')
          expect(healthCheck).to.haveOwnProperty('server_time_utc')
          expect(healthCheck).to.haveOwnProperty('version')
          expect(healthCheck).to.haveOwnProperty('cluster_name')
          expect(healthCheck).to.haveOwnProperty('cluster_id')
        })
      })
      describe('#delete', () => {
        it('should remove a secret at the specified path', async () => {
          const testCase = _.get(fixtures, 'vault.test-cases.delete')
          await vault.delete(testCase.mountPoint, testCase.path)
          const response = await vault.list(testCase.mountPoint)
          expect(response).to.be.an('object')
          expect(response).to.haveOwnProperty('request_id')
          expect(response).to.haveOwnProperty('lease_id')
          expect(response).to.haveOwnProperty('renewable')
          expect(response).to.haveOwnProperty('lease_duration')
          expect(response).to.haveOwnProperty('data')
          expect(response).to.haveOwnProperty('wrap_info')
          expect(response).to.haveOwnProperty('warnings')
          expect(response).to.haveOwnProperty('auth')
          expect(response.data).to.be.an('object')
          expect(response.data).to.haveOwnProperty('keys')
          expect(response.data.keys.indexOf(testCase.path)).to.be.eq(-1)
        })
      })
      describe('#write', () => {
        const testCase = _.get(fixtures, 'vault.test-cases.write')
        before(async () => {
          try {
            await vault.delete(testCase.mountPoint, testCase.path)
          } catch (err) {
            debug(`Errored deleting for the write test. This is expected in most cases. ${err || ''}`)
          }
        })
        it('should create a secret at the specified path', async () => {
          await vault.write(testCase.mountPoint, testCase.path, testCase.data)
          const response = await vault.read(testCase.mountPoint, testCase.path)
          expect(response).to.be.an('object')
          expect(response).to.haveOwnProperty('request_id')
          expect(response).to.haveOwnProperty('lease_id')
          expect(response).to.haveOwnProperty('renewable')
          expect(response).to.haveOwnProperty('lease_duration')
          expect(response).to.haveOwnProperty('data')
          expect(response).to.haveOwnProperty('wrap_info')
          expect(response).to.haveOwnProperty('warnings')
          expect(response).to.haveOwnProperty('auth')
          expect(response.data).to.be.an('object')
        })
      })
      describe('#patch', () => {
        const testCase = _.get(fixtures, 'vault.test-cases.patch')
        const testCaseWrite = _.get(fixtures, 'vault.test-cases.write')
        before(async () => {
          try {
            await vault.delete(testCase.mountPoint, testCase.path)
          } catch (err) {
            debug(`Errored deleting for the patch test. This is expected in most cases. ${err || ''}`)
          }
          debug('Writing to patch endpoint')
          await vault.write(testCase.mountPoint, testCase.path, testCaseWrite.data)
        })
        it('should create a secret at the specified path', async () => {
          const expectedKeys = _.uniq([..._.keys(testCase.data), ..._.keys(testCaseWrite.data)])
          await vault.patch(testCase.mountPoint, testCase.path, testCase.data)
          const response = await vault.read(testCase.mountPoint, testCase.path)
          expect(response).to.be.an('object')
          expect(response).to.haveOwnProperty('request_id')
          expect(response).to.haveOwnProperty('lease_id')
          expect(response).to.haveOwnProperty('renewable')
          expect(response).to.haveOwnProperty('lease_duration')
          expect(response).to.haveOwnProperty('data')
          expect(response).to.haveOwnProperty('wrap_info')
          expect(response).to.haveOwnProperty('warnings')
          expect(response).to.haveOwnProperty('auth')
          expect(response.data).to.be.an('object')
          expect(response.data).to.haveOwnProperty('data')
          _.forEach(expectedKeys, keyName => {
            expect(response.data.data).to.haveOwnProperty(keyName)
          })
        })
      })
      describe('#list', () => {
        const testCase = _.get(fixtures, 'vault.test-cases.list')
        before(async () => {
          try {
            await vault.delete(testCase.mountPoint, testCase.path)
          } catch (err) {
            debug(`Errored deleting entry for list test. This is expected in most cases. ${err || ''}`)
          }
          debug('Writing to patch endpoint')
          await vault.write(testCase.mountPoint, testCase.fullPath, testCase.data)
        })
        it('should be allowed to list secrets', async () => {
          const response = await vault.list(testCase.mountPoint, testCase.path)
          expect(response).to.be.an('object')
          expect(response).to.haveOwnProperty('request_id')
          expect(response).to.haveOwnProperty('lease_id')
          expect(response).to.haveOwnProperty('renewable')
          expect(response).to.haveOwnProperty('lease_duration')
          expect(response).to.haveOwnProperty('data')
          expect(response).to.haveOwnProperty('wrap_info')
          expect(response).to.haveOwnProperty('warnings')
          expect(response).to.haveOwnProperty('auth')
          expect(response.data).to.be.an('object')
          expect(response.data).to.haveOwnProperty('keys')
          expect(response.data.keys).to.be.an('array')
        })
      })
      describe('#read', () => {
        const testCase = _.get(fixtures, 'vault.test-cases.read')
        before(async () => {
          try {
            await vault.delete(testCase.mountPoint, testCase.path)
          } catch (err) {
            debug(`Errored deleting entry for read test. This is expected in most cases. ${err || ''}`)
          }
          debug('Writing to patch endpoint')
          await vault.write(testCase.mountPoint, testCase.path, testCase.data)
        })
        it('should be allowed to read secrets', async () => {
          const response = await vault.read(testCase.mountPoint, testCase.path)
          expect(response).to.be.an('object')
          expect(response).to.haveOwnProperty('request_id')
          expect(response).to.haveOwnProperty('lease_id')
          expect(response).to.haveOwnProperty('renewable')
          expect(response).to.haveOwnProperty('lease_duration')
          expect(response).to.haveOwnProperty('data')
          expect(response).to.haveOwnProperty('wrap_info')
          expect(response).to.haveOwnProperty('warnings')
          expect(response).to.haveOwnProperty('auth')
          expect(response.data).to.be.an('object')
          expect(response.data).to.haveOwnProperty('data')
          expect(response.data.data).keys(_.keys(testCase.data))
          expect(response.data).to.haveOwnProperty('metadata')
        })
      })
    })
  }
})
