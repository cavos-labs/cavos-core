import { NextResponse } from "next/server";
import { RpcProvider, Call, Account, TypedData, cairo } from "starknet";
import { formatCall } from "@avnu/gasless-sdk";
import {
  decryptPin,
  decryptSecretWithPin,
  parseResponse,
} from "../../../../../../lib/utils";
import { toBeHex, toBigInt } from "ethers";
import axios from "axios";

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

export async function POST(req: Request) {
  console.log(
    `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim endpoint hit, START.`
  );
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, UNAUTHORIZED: Missing or invalid Authorization header`
      );
      return NextResponse.json(
        { message: "Unauthorized: Missing or invalid Bearer token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (token !== CAVOS_TOKEN) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, UNAUTHORIZED: Invalid bearer token received`
      );
      return NextResponse.json(
        { message: "Unauthorized: Invalid Bearer token" },
        { status: 401 }
      );
    }

    let { address, hashedPk, hashedPin } = await req.json();
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, REQUEST_RECEIVED: address=${address}`
    );

    let pin = decryptPin(hashedPin, SECRET_TOKEN);
    let pk = decryptSecretWithPin(hashedPk, pin);
    const provider = new RpcProvider({ nodeUrl: process.env.RPC });

    // Get reward claim calldata
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, FETCHING_CLAIM_CALLDATA.`
    );
    const calldataResponse = await axios.get(
      `https://api.vesu.xyz/users/${address}/strk-rewards/calldata`
    );
    const calldata = calldataResponse.data.data;
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CLAIM_CALLDATA_FETCHED: ${JSON.stringify(
        calldata
      )}`
    );

    // Get AVNU quote
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, FETCHING_AVNU_QUOTE.`
    );
    const quotesResponse = await axios.get(
      `https://starknet.api.avnu.fi/internal/swap/quotes-with-prices?sellTokenAddress=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d&buyTokenAddress=0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8&sellAmount=${calldata.amount}&takerAddress=${address}&size=1&integratorName=AVNU%20Portal`
    );
    const quotes = quotesResponse.data.quotes;
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, QUOTE_RECEIVED: ${JSON.stringify(
        quotes[0]
      )}`
    );

    const account = new Account(provider, address, pk);
    let calls: Call[] = [
      {
        contractAddress:
          "0x0387f3eb1d98632fbe3440a9f1385aec9d87b6172491d3dd81f1c35a7c61048f",
        entrypoint: "claim",
        calldata: [calldata.amount, calldata.proof],
      },
    ];

    calls = formatCall(calls);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CALLS_FORMATTED: ${JSON.stringify(
        calls
      )}`
    );

    // Build typed data
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, BUILDING_TYPED_DATA_FOR_CLAIM.`
    );
    const typeDataResponse = await fetch(
      "https://starknet.api.avnu.fi/paymaster/v1/build-typed-data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AVNU_API_KEY || "",
          "ask-signature": "false",
        },
        body: JSON.stringify({
          userAddress: address,
          calls,
          accountClassHash: null,
        }),
      }
    );

    if (!typeDataResponse.ok) {
      const errorText = await typeDataResponse.text();
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, TYPED_DATA_BUILD_ERROR: ${errorText}`
      );
      throw new Error(`API error typedata: ${errorText}`);
    }

    let typeData: TypedData = await parseResponse(typeDataResponse);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, TYPED_DATA_BUILT_SUCCESSFULLY.`
    );

    // Sign typed data
    let userSignature = await account.signMessage(typeData);
    userSignature = Array.isArray(userSignature)
      ? userSignature.map((sig) => toBeHex(BigInt(sig)))
      : [toBeHex(BigInt(userSignature.r)), toBeHex(BigInt(userSignature.s))];
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CLAIM_MESSAGE_SIGNED.`
    );

    // Execute transaction
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, EXECUTING_CLAIM_TRANSACTION.`
    );
    const executeTransaction = await fetch(
      "https://starknet.api.avnu.fi/paymaster/v1/execute",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AVNU_API_KEY || "",
          "ask-signature": "true",
        },
        body: JSON.stringify({
          userAddress: address,
          typedData: JSON.stringify(typeData),
          signature: userSignature,
          deploymentData: null,
        }),
      }
    );

    if (!executeTransaction.ok) {
      const errorText = await executeTransaction.text();
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CLAIM_EXECUTION_ERROR: ${errorText}`
      );
      throw new Error(`Execution API error: ${errorText}`);
    }

    const result = await executeTransaction.json();
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CLAIM_TRANSACTION_SENT: hash=${
        result.transactionHash
      }`
    );

    if (!result.transactionHash) {
      throw new Error("Claim transaction missing hash in response");
    }

    await provider.waitForTransaction(result.transactionHash);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, CLAIM_TRANSACTION_CONFIRMED.`
    );

    // Swap process
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, BUILDING_TYPED_DATA_FOR_SWAP.`
    );
    const swapTypedDataResponse = await fetch(
      "https://starknet.api.avnu.fi/swap/v2/build-typed-data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AVNU_API_KEY || "",
          "ask-signature": "false",
        },
        body: JSON.stringify({
          quoteId: quotes[0].quoteId,
          takerAddress: address,
          slippage: 0.05,
          includeApprove: true,
          gasTokenAddress:
            "0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxGasTokenAmount: toBeHex(1000000),
        }),
      }
    );

    if (!swapTypedDataResponse.ok) {
      const errorText = await swapTypedDataResponse.text();
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_TYPED_DATA_BUILD_ERROR: ${errorText}`
      );
      throw new Error(`API error swap typedata: ${errorText}`);
    }

    const swapTypedData: TypedData = await parseResponse(swapTypedDataResponse);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_TYPED_DATA_BUILT.`
    );

    // Sign swap data
    userSignature = await account.signMessage(swapTypedData);
    userSignature = Array.isArray(userSignature)
      ? userSignature.map((sig) => toBeHex(BigInt(sig)))
      : [toBeHex(BigInt(userSignature.r)), toBeHex(BigInt(userSignature.s))];
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_MESSAGE_SIGNED.`
    );

    // Execute swap
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, EXECUTING_SWAP_TRANSACTION.`
    );
    const swapExecuteTransaction = await fetch(
      "https://starknet.api.avnu.fi/swap/v2/execute",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.AVNU_API_KEY || "",
          "ask-signature": "false",
        },
        body: JSON.stringify({
          quoteId: quotes[0].quoteId,
          signature: userSignature,
        }),
      }
    );

    if (!swapExecuteTransaction.ok) {
      const errorText = await swapExecuteTransaction.text();
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_EXECUTION_ERROR: ${errorText}`
      );
      return NextResponse.json({ result: false });
    }

    const swapResult = await swapExecuteTransaction.json();
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_EXECUTED_SUCCESSFULLY: ${JSON.stringify(
        swapResult
      )}`
    );

    if (!swapResult.transactionHash) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, SWAP_RESULT_MISSING_TRANSACTION_HASH.`
      );
      throw new Error("Missing transaction hash in swap response");
    }
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, FINISH.`
    );
    return NextResponse.json({
      result: swapResult.transactionHash,
      amount: toBigInt(calldata.amount),
    });
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/claim, FATAL_ERROR: ${
        error.message || error
      }`
    );
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
