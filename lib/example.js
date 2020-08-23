#!/usr/bin/env node
const _ = require('lodash')
const options = {}

// SEAL, TOKEN are provided here as examples. never commit credentails to git.
const VAULT_SEAL = _.defaultTo(_.get(process, 'env.VAULT_SEAL'), '')
const VAULT_URL = _.defaultTo(_.get(process, 'env.VAULT_ADDR'), 'http://localhost:8200')
const VAULT_TOKEN = _.get(process, 'env.VAULT_TOKEN')
const VaultApi = require('..')
const vaultOptions = { url: VAULT_URL, keys: [VAULT_SEAL], auth: { type: 'token', payload: VAULT_TOKEN, path: 'root' } }
const vault = new VaultApi(vaultOptions)

console.log(_.omit(vaultOptions, ['keys', 'auth']))
vault.init()
  .then(async (data) => {
    // console.log(data)
    console.log(await vault.write('some-very', 'confidential/secret', { 'lorem-ipsum': '2' }))
    console.log(await vault.delete('some-very', 'confidential/secret', { 'lorem-ipsum': '2' }))
    // console.log(await vault.read('some-very', 'confidential/secret'))
    // console.log(await vault.patch('some-very', 'confidential/secret', { 'lorem-ipsum': '2', 'super-secret': 1 }))
    // console.log(await vault.read('some-very', 'confidential/secret'))
  })
  .catch((err) => {
    console.log(err)
  })
