
export interface Project {
    genNew: string;
    projectTokenSymbol: string;
}

export interface WalletCalculationResult {
    walletNumber: string;
    buyAmount: number;
    totalAmountNeeded: number;
    tokensBought: number;
  
  }
  
export interface TokenData {
    lookupTableAddress: string;
    mintAuthority: string;
    bondingCurve: string;
    associatedBondingCurce: string;
    metadata: string;
    eventAuthority: string;
    tokenAddress: string;
    tokenMintKey: string;
    buyIncrementPercentage: number;
    slippagePctg: number;
    projectTokenSymbol: string;
    tokenName: string;
    tokenSymbol: string;
    imageFileName: string;
    telegramUrl: string;
    twitterUrl: string;
    websiteUrl: string;
    description: string;
    numberOfWallets: number;
    startingBuyAmount: number;
    minTradeAmount: number;
    maxTradeAmount: number;

}