import { ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { TokenData } from "../config/types";
import { connection, devWalletBuy, FEERCPT, jitoTips, perKToken, priorityFees, programID, slippageDefault } from "../config";
import * as anchor from "@coral-xyz/anchor";
import { CustomWallet } from "../pumpFun/wallet";
import { pumpFunProgram } from "../pumpFun/PumpFunProgram";
import { createMetadata } from "../nftUtils";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { chunkArray, METADATA_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";
import { JitoExecutor } from "./JitoExecutor";
import { getRandomUniqueNumber } from "../utils/functions";
import PumpeCutor from "../pumpFun/Pumpecutor";
import { BN } from "bn.js";
import { addLookupTableInfo } from '../config/index';
import { web3 } from "@coral-xyz/anchor";
import { getRandomTipAccount } from "../clients/config";
import { readFileSync } from "fs";


export const LaunchBundler = async (senderWallet: Keypair, myWallet: Keypair, wallets: any[], t: TokenData) => {

    let mainWallet = new CustomWallet(myWallet);
    let provider = new anchor.AnchorProvider(connection, mainWallet as anchor.Wallet, anchor.AnchorProvider.defaultOptions())

    let pfProgram = pumpFunProgram({
        provider: provider,
        programId: programID,
    });

    console.log(' Uploading Image to Storage ');
    const resultUri = await createMetadata(
        t.imageFileName,
        t.tokenName,
        t.tokenSymbol,
        t.description,
        t.twitterUrl,
        t.telegramUrl,
        t.websiteUrl,
        true
    );


    const feeRecipient = FEERCPT;
    const [globalPublicKey] = PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("global")], programID);

    let tokenMint = Keypair.fromSecretKey(bs58.decode(t.tokenMintKey));
    let mintAuthority = new PublicKey(t.mintAuthority)
    let bondingCurve = new PublicKey(t.bondingCurve)
    let associatedBondingCurve = new PublicKey(t.associatedBondingCurce)
    let metadata = new PublicKey(t.metadata)
    let eventAuthority = new PublicKey(t.eventAuthority)
    const launchTnx: TransactionInstruction[] = [];
    const devtradeAmount = Number(Number(0.85*Number(devWalletBuy) / Number(perKToken)).toFixed(0));


    const generateLaunchTnx = async () => {
        const createInst = await pfProgram.methods.create(t.tokenName, t.tokenSymbol, resultUri)
            .accounts({
                mint: tokenMint.publicKey,
                mintAuthority: mintAuthority,
                bondingCurve: bondingCurve,
                associatedBondingCurve: associatedBondingCurve,
                global: globalPublicKey,
                mplTokenMetadata: METADATA_PROGRAM_ID,
                metadata: metadata,
                eventAuthority: eventAuthority,
            })
            .signers([tokenMint])
            .instruction();

        const userAta = getAssociatedTokenAddressSync(tokenMint.publicKey, mainWallet.publicKey, true, TOKEN_PROGRAM_ID);

        const buytnx = await pfProgram.methods.buy(new anchor.BN(devtradeAmount * 1e6), new anchor.BN(Number(devWalletBuy) * 1e9)).accounts({
            global: globalPublicKey,
            feeRecipient: feeRecipient,
            mint: tokenMint.publicKey,
            bondingCurve: bondingCurve,
            associatedBondingCurve: associatedBondingCurve,
            associatedUser: userAta,
            user: myWallet.publicKey
        }).signers([myWallet])
            .instruction()



        launchTnx.push(ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 100000
        }));
        launchTnx.push(ComputeBudgetProgram.setComputeUnitLimit({
            units: 25e4
        }))
        launchTnx.push(createInst);

        launchTnx.push(
            createAssociatedTokenAccountInstruction(
                myWallet.publicKey,
                userAta,
                myWallet.publicKey,
                tokenMint.publicKey,
            )
        )
        launchTnx.push(buytnx);

        const tipSwapIxn = web3.SystemProgram.transfer({
            fromPubkey: myWallet.publicKey,
            toPubkey: getRandomTipAccount(),
            lamports: jitoTips * LAMPORTS_PER_SOL,
        });
        launchTnx.push(tipSwapIxn);

        return launchTnx;
    }

    const generateMassBundlers = async () => {
        const txsSigned: VersionedTransaction[] = [];
        wallets = JSON.parse(readFileSync(`./wallets/${t.tokenAddress}.wallets.json`, 'utf-8'));

        const chunkedKeypairs = chunkArray(wallets, 6); // EDIT CHUNKS?
        const lookupTableAccount = (
            await connection.getAddressLookupTable(new PublicKey(t.lookupTableAddress))
        ).value;
        console.log(' Generating Buy chunkedKeypairs '+wallets.length) 
        console.log(' Generating Buy chunkedKeypairs '+chunkedKeypairs.length)

        // Iterate over each chunk of keypairs
        for (let chunkIndex = 0; chunkIndex < chunkedKeypairs.length; chunkIndex++) {
            const chunk = chunkedKeypairs[chunkIndex];
            const instructionsForChunk: TransactionInstruction[] = [];

            for (let i = 0; i < chunk.length; i++) {
                const item = chunk[i];
                const wallet = Keypair.fromSecretKey(bs58.decode(item.privateKey));
                let trade = ' Preparing '
                const tradeAmount = Number(t.startingBuyAmount) / Number(perKToken)
                const minMaxAmount = Number(t.startingBuyAmount)
                const maxSolCost = Number(minMaxAmount)
                const walletBal = await connection.getBalance(wallet.publicKey);
                console.log('Wallet balance is ' + walletBal.toString())
                trade += ' Buy for wallet ' + wallet.publicKey.toBase58() + "-" + Number(maxSolCost).toFixed(5) + ":" + Number(tradeAmount * 1e6).toFixed(0)
                console.log(trade);
                const pumper = new PumpeCutor(
                    tokenMint.publicKey,
                    globalPublicKey,
                    feeRecipient,
                    bondingCurve,
                    associatedBondingCurve,
                    wallet
                )
                const buytnxs = await pumper.createBuyTransaction(new BN(Number(tradeAmount * 1e6).toFixed(0)), new BN(walletBal), priorityFees);
                instructionsForChunk.push(...buytnxs);
            }
            const wallet = Keypair.fromSecretKey(bs58.decode(chunk[0].privateKey));

            const keypair = wallet;

            if (chunkIndex === chunkedKeypairs.length - 1) {
                const tipSwapIxn = web3.SystemProgram.transfer({
                    fromPubkey: senderWallet.publicKey,
                    toPubkey: getRandomTipAccount(),
                    lamports: jitoTips * LAMPORTS_PER_SOL,
                });
                instructionsForChunk.push(tipSwapIxn);
                console.log('Jito tip added :).');
            }

            const message = new TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash: blockhash.blockhash,
                instructions: instructionsForChunk,
            }).compileToV0Message([lookupTableAccount]);

            const versionedTx = new VersionedTransaction(message);

            const serializedMsg = versionedTx.serialize();
            console.log("Txn size:", serializedMsg.length);
            if (serializedMsg.length > 1232) { console.log('tx too big'); }

            console.log("Signing transaction with chunk signers");

            // Sign with the wallet for tip on the last instruction
            if (chunkIndex === chunkedKeypairs.length - 1) {
                versionedTx.sign([senderWallet]);
            }

            for (const item of chunk) {
                const wallet = Keypair.fromSecretKey(bs58.decode(item.privateKey));
                versionedTx.sign([wallet]);
            }


            txsSigned.push(versionedTx);
        }

        return txsSigned;
    }

    const generateBundlers = async () => {
        const bundleTnx: any[] = [];

        for (var twall in wallets) {
            const item = wallets[twall];
            const wallet = Keypair.fromSecretKey(bs58.decode(item.privateKey));
            let trade = ' Preparing '
            const tradeAmount = getRandomUniqueNumber(item.minTradeAmount / (perKToken), item.maxTradeAmount / (perKToken), 0);
            const minMaxAmount = Number(item.maxTradeAmount) + Number(item.maxTradeAmount) * 0.15;
            const maxSolCost = Number(minMaxAmount) + Number(minMaxAmount) * Number(slippageDefault / 100);
            const walletBal = await connection.getBalance(wallet.publicKey);
            console.log('Wallet balance is ' + walletBal.toString())
            trade += ' Buy for wallet ' + wallet.publicKey.toBase58() + "-" + Number(maxSolCost).toFixed(2) + ":" + tradeAmount

            const pumper = new PumpeCutor(
                tokenMint.publicKey,
                globalPublicKey,
                feeRecipient,
                bondingCurve,
                associatedBondingCurve,
                wallet
            )
            const buytnxs = await pumper.createBuyTransaction(new BN(tradeAmount * 1e6), new BN(maxSolCost * LAMPORTS_PER_SOL), priorityFees);


            bundleTnx.push({ wallet: wallet, instructions: buytnxs });
            console.log(trade);
        }

        return bundleTnx;
    }
    const blockhash = await connection.getLatestBlockhash('finalized');

    console.log(' Generating Launch Transactions ')
    const ltnx = await generateLaunchTnx();
    const addLookupTableInfo = (await connection.getAddressLookupTable(new PublicKey(t.lookupTableAddress))).value
    console.log(' Generating Buy Transactions ')

    const txMainSwaps: VersionedTransaction[] = await generateMassBundlers();
    const launchInst = ltnx;


    const fin = new VersionedTransaction(
        new TransactionMessage(
            {
                payerKey: senderWallet.publicKey,
                recentBlockhash: blockhash.blockhash,
                instructions: launchInst
            }
        ).compileToV0Message([addLookupTableInfo])
    )
    fin.sign([senderWallet, tokenMint])

    const bundledTxns: VersionedTransaction[] = [];
    bundledTxns.push(fin);
    bundledTxns.push(...txMainSwaps);


    try {



        const jito = new JitoExecutor();
        let accepted = false;
        const onAcceptedBundle = async (bundleResult: BundleResult, bundleId: string) => {

            const resbundleId = bundleResult.bundleId;
            //console.log(' resbundleId of Launch Recd '+resbundleId+":"+bundleId)

            if (resbundleId == bundleId) {
                const isAccepted = bundleResult.accepted;
                const isRejected = bundleResult.rejected;
                if (isAccepted) {
                    accepted = true;
                    console.info(
                        `Bundle ${bundleId} accepted in slot ${bundleResult?.accepted?.slot} by validator ${bundleResult?.accepted?.validatorIdentity}`,
                    );
                    console.log(' Confirmation of Launch Recd')

                }
                if (isRejected && !accepted) {
                    console.info(bundleResult.rejected, `Bundle ${bundleId} rejected:`);
                }
            }
        }


        jito.executeAndConfirmBundle(bundledTxns, [senderWallet, tokenMint], blockhash, onAcceptedBundle);

    } catch (Error) {
        console.log('Error Occured')
        return null;
    }




}
