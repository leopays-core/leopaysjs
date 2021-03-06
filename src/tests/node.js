const { JsonRpc, RpcError, Api } = require('../../dist');
const { JsSignatureProvider } = require('../../dist/leopaysjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');

const privateKey = '5JuH9fCXmU3xbj8nRmhPZaVrxxXrdPaRmZLW1cznNTmTQR2Kg5Z'; // replace with "bob" account private key
const r1PrivateKey = 'PVT_R1_GrfEfbv5at9kbeHcGagQmvbFLdm6jqEpgE1wsGbrfbZNjpVgT';
/* new accounts for testing can be created by unlocking a leopays-cli wallet then calling:
 * 1) leopays-cli create key --to-console (copy this privateKey & publicKey)
 * 2) leopays-cli wallet import
 * 3) leopays-cli create account bob publicKey
 * 4) leopays-cli create account alice publicKey
 */

const rpc = new JsonRpc('http://localhost:8888', { fetch });
const signatureProvider = new JsSignatureProvider([privateKey, r1PrivateKey]);
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

const transactWithConfig = async (config, memo, from = 'bob', to = 'alice') => {
  return await api.transact({
    actions: [{
      account: 'lpc.token',
      name: 'transfer',
      authorization: [{
        actor: from,
        permission: 'active',
      }],
      data: {
        from,
        to,
        quantity: '0.0001 LPC',
        memo,
      },
    }]
  }, config);
};

const transactWithoutConfig = async () => {
  const transactionResponse = await transactWithConfig({ blocksBehind: 3, expireSeconds: 30 }, 'transactWithoutConfig');
  const blockInfo = await rpc.get_block(transactionResponse.processed.block_num - 3);
  const currentDate = new Date();
  const timePlusTen = currentDate.getTime() + 10000;
  const timeInISOString = (new Date(timePlusTen)).toISOString();
  const expiration = timeInISOString.substr(0, timeInISOString.length - 1);

  return await api.transact({
    expiration,
    ref_block_num: blockInfo.block_num & 0xffff,
    ref_block_prefix: blockInfo.ref_block_prefix,
    actions: [{
      account: 'lpc.token',
      name: 'transfer',
      authorization: [{
        actor: 'bob',
        permission: 'active',
      }],
      data: {
        from: 'bob',
        to: 'alice',
        quantity: '0.0001 LPC',
        memo: 'transactWithoutConfig2',
      },
    }]
  });
};

const broadcastResult = async (signaturesAndPackedTransaction) => await api.pushSignedTransaction(signaturesAndPackedTransaction);

const transactShouldFail = async () => await api.transact({
  actions: [{
    account: 'lpc.token',
    name: 'transfer',
    authorization: [{
      actor: 'bob',
      permission: 'active',
    }],
    data: {
      from: 'bob',
      to: 'alice',
      quantity: '0.0001 LPC',
      memo: '',
    },
  }]
});

const rpcShouldFail = async () => await rpc.get_block(-1);

module.exports = {
  transactWithConfig,
  transactWithoutConfig,
  broadcastResult,
  transactShouldFail,
  rpcShouldFail
};
