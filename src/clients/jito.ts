  
import { SearcherClient,searcherClient as jitoSearcherClient, } from 'jito-ts/dist/sdk/block-engine/searcher';
import { isDevnet } from '../config';

const BLOCK_ENGINE_URLS = 
[
"frankfurt.mainnet.block-engine.jito.wtf","tokyo.mainnet.block-engine.jito.wtf",
"amsterdam.mainnet.block-engine.jito.wtf"]; 

const searcherClients: SearcherClient[] = [];

for (const url of BLOCK_ENGINE_URLS) {
  const client = jitoSearcherClient(url, undefined, {
    'grpc.keepalive_timeout_ms': 4000,
  });
  searcherClients.push(client);
}

 

// all bundles sent get automatically forwarded to the other regions.
// assuming the first block engine in the array is the closest one
const searcherClient = searcherClients[0];

export { searcherClient, searcherClients  };