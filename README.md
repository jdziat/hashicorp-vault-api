# hashicorp-vault-api

A wrapper for the hashicorp vault rest api.


## Getting Started
- Starting vault
  - Option 1 - full vault environment with persistent storage
    - Rename `docker-compose-full.yaml` to `docker-compose.yaml`
    - Run `docker-compose up`
  - Option 2 - dev vault environment
    - Rename `docker-compose-dev.yaml` to `docker-compose.yaml`
    - Run `docker-compose up`
  - Option 3 - vault running in dev mode
    - Download vault binary from: [Vault](https://www.vaultproject.io/downloads)
    - Run `vault server -dev`
      - Read more at: [Docs](https://www.vaultproject.io/docs/concepts/dev-server)


```js
const VaultApi = require('hashicorp-vault-api')
const vault  = new VaultApi()
vault.init()
    .then((data)=>{
        console.log(data)
    })
    .catch((err)=>{
        console.log(err)
    })
```

## Docs

#### new VaultApi(options)
options {Object}
options.keys {Array} - An array of keys(strings) to use to try and unseal your vault if it's sealed during the initalization process
options.auth {Object}
options.auth.type {String} - the type of authentication to perform. Example: token
options.auth.path {String} - the path to the authentication backend that you are authenticating against
options.auth.payload {String} - the json objec to send to the authentication endpoint

examples:
```js
// The below would be used for a username/password endpoint named user-pass 
const userPass = {auth:{type:'user-pass',path:'root',payload:{password:'test'}}}
// which would result in a url of: /v1/auth/user-pass/login/root 
// and a json payload of {password:'test'} being sent

// The below would be for a token endpoint authentication
const token = {auth:{type:'token',path:'',payload:'some-token-value'}}
// This wouldn't send a request but would set the X-Vault-Token header value to the supplied value
```

#### vault.init()
- description: attempts to unseal and authenticate with the given properties on intialization and returns the current x-vault-token.
- type: async
- parameters: NONE
- returns: String
- response: 's.xxxxxxxxxx'

----


### vault.read(mountPoint,path,params)
- description: returns the data present at mountpoint ->path
- type: async
- parameters
  - mountPoint {String} - the initial location of the resource your are trying to read. Example: 'kv'
  - path {String} - the location after the pointpoint of the resource. Example: 'website-1/postgres'
  - params {Object} - a object containing any additional parameters to be provided via the query string in the request being = - made. Example: {list:true} => get {{url}}?list=true
- returns: Object
- response: 
   - request_id {String}
   - lease_id {String}
   - renewable {Boolean}
   - data {Object}
   - data {Object}
   - metadata {Object}

examples:
```js
const response = await vault.read('secret','some-very/confidential/secret')
// response:
// {
//   request_id: '7e6ad98c-b634-355e-23b8-bb094c144941',
//   lease_id: '',
//   renewable: false,
//   lease_duration: 0,
//   data: {
//     data: { lorem: 'ipsum' },
//     metadata: {
//       created_time: '2020-08-22T17:37:06.3453627Z',
//       deletion_time: '',
//       destroyed: false,
//       version: 1
//     }
//   },
//   wrap_info: null,
//   warnings: null,
//   auth: null
// }
```
---
### vault.write(mountpoint,path,payload)
- description: Writes the given payload to the mountpoint -> path provided
- type: async
- parameters
  - mountPoint {String} - the initial location of the resource your are trying to write. Example: 'kv'
  - path {String} - the location after the pointpoint of the resource. Example: 'website-1/postgres'
  - payload {Object} - the JSON object you want to write to the endpoint specified. Example:{username:'test',password:'secret'}
- returns: Object
- response: 
  - request_id {String}
  - lease_id {String}
  - renewable {Boolean}
  - data {Object}
    - data {Object|String}
    - metadata {Object}

examples:
```js
const response = await vault.write('kv','website-1/postgres',{username:'test',password:'secret'})
// response:
// {
//   request_id: '7e6ad98c-b634-355e-23b8-bb094c144941',
//   lease_id: '',
//   renewable: false,
//   lease_duration: 0,
//   data: {
//       created_time: '2020-08-22T17:37:06.3453627Z',
//       deletion_time: '',
//       destroyed: false,
//       version: 1
//   },
//   wrap_info: null,
//   warnings: null,
//   auth: null
// }
```
----
### vault.delete(mountpoint,path)
description: Deletes the data stored at the mountpoint -> path provided
type: async
parameters
  mountPoint {String} - the initial location of the resource your are trying to delete. Example: 'kv'
  path {String} - the location after the pointpoint of the resource. Example: 'website-1/postgres'
returns: Blank Body

examples:
```js
const response = await vault.delete('kv','website-1/postgres')
// response:
```
----

## TODO

- Implement OpenApi request/response validation