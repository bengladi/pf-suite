import { TokenAccount, SPL_ACCOUNT_LAYOUT } from "@raydium-io/raydium-sdk";
import { WalletCalculationResult } from "../config/types";
import { logger } from "../services/logger";
import { ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer, Transaction, TransactionSignature, VersionedTransaction } from "@solana/web3.js";




export const calculateWalletsOutgo=(
    startingBuyAmount: number,
    numberOfWallets: number,
    buyIncrementPercentage: number,
    tokenAccountCreationFee: number,
    priorityFee: number,
    tokenCreationFee: number,
    tokenAttributionFee: number,
    initialTokenPrice: number,
    tokenReductionPercentage: number
  ) =>{
    const results: WalletCalculationResult[] = [];
    let currentBuyAmount:number = startingBuyAmount;
    let totalOutgo:number = tokenCreationFee ;
    let totalTokensBought:number = 0;
    let currentTokenPrice:number = initialTokenPrice;
  
    logger.debug(`Token Creation Fee: ${tokenCreationFee.toFixed(6)} SOL`);
     logger.debug(`Token priorityFee Fee: ${priorityFee} SOL`);

    for (let i = 0; i < numberOfWallets; i++) {
      const totalAmountNeeded :number= Number(currentBuyAmount + tokenAccountCreationFee + priorityFee);
      totalOutgo += totalAmountNeeded;
      currentTokenPrice *= (1+tokenReductionPercentage/100)
      const tokensBought = currentBuyAmount / currentTokenPrice;
      totalTokensBought += tokensBought;
      logger.debug(`Token currentBuyAmount Fee: ${currentBuyAmount} SOL`);
      logger.debug(`Token totalOutgo  : ${totalOutgo} SOL`);
      logger.debug(`Token priorityFee Fee: ${priorityFee} SOL`);

      logger.debug(`Wallet ${i + 1}: Buy Amount = ${currentBuyAmount.toFixed(6)} SOL, Total Amount Needed = ${totalAmountNeeded.toFixed(6)} SOL, Tokens Bought = ${tokensBought.toFixed(6)}`);
  
      results.push({
        walletNumber: 'Wallet'+(i + 1),
        buyAmount: Number(Number(currentBuyAmount).toFixed(5)),
        totalAmountNeeded: Number(Number(totalAmountNeeded).toFixed(5)),
        tokensBought:  Number(Number(tokensBought).toFixed(0)),
      });
      currentBuyAmount += currentBuyAmount * (buyIncrementPercentage / 100);
      
    }
  
    logger.debug(`Total Outgo: ${totalOutgo.toFixed(6)} SOL`);
    logger.debug(`Total Tokens Bought: ${totalTokensBought.toFixed(0)}`);
     
    return {results:results,totalOutgo:totalOutgo,totalTokensBought};
  }
  
  
  const customHeaders = {
    walletNumber: 'Wallet ID',
    buyAmount: 'Amount for Buy',
    totalAmountNeeded: 'Total Amount Required',
    tokensBought: 'Estimated Tokens Bought'
  };
  
  export const transformTable=(data:any[])=>{
   return data.map(item => {
    const transformedItem = {};
    for (const key in item) {
        if (customHeaders[key]) {
            transformedItem[customHeaders[key]] = item[key];
        }
    }
    return transformedItem;
  });}

  export async function getWalletTokenAccount(connection: Connection, wallet: PublicKey,tokenMint:PublicKey): Promise<TokenAccount[]> {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
       mint:tokenMint
    });
    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
  }
  