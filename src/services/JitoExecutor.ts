import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";
import { searcherClient, searcherClients } from "../clients/jito";
import { Bundle as JitoBundle } from 'jito-ts/dist/sdk/block-engine/types.js';

import {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  Version,
  VersionedTransaction,
} from '@solana/web3.js';
  import bs58 from "bs58";
import { connection, jitoTips, priorityFees } from "../config";
import { getRandomTipAccount } from "../clients/config";
 

export class JitoExecutor   {
  constructor() {
  }
 
  public async executeAndConfirmBundle(
transactions: VersionedTransaction[], payers: Keypair[], latestBlockhash: BlockhashWithExpiryBlockHeight, onAcceptedBundle: (bundleResult: BundleResult,bundleId:string) => Promise<void>,
  ) {
    console.log('Executing transaction...');

    const bundle: JitoBundle = new JitoBundle(transactions, 5);
   // bundle.addTipTx(payers[0], jitoTips * LAMPORTS_PER_SOL, getRandomTipAccount(), latestBlockhash.blockhash);


     
      const bundleId = await searcherClient
      .sendBundle(bundle)
      .then((bundleId) => {
        console.log(
          `Bundle ${bundleId} sent, backrunning `,
        ); 
        console.log(bundleId)
        return bundleId;

      }).catch((error) => { 
        console.log(error, 'Error sending bundle');
        if (
          error?.message?.includes(
            'Bundle Dropped, no connected leader up soon',
          )
        ) {
          console.log(
            'Error sending bundle: Bundle Dropped, no connected leader up soon.',
          );
        } else {
          console.log(error, 'Error sending bundle');
        }
        return 'Error sending bundle';
      });

     
    console.log('Checking for Bundle Id '+ bundleId);
   
    searcherClient.onBundleResult((bundleResult: BundleResult) => 
        {   
           onAcceptedBundle(bundleResult,bundleId);
         },   (error) => {
            console.log(error);
             return false;
        },
    );
     

    return bundleId;
    
  }


}
