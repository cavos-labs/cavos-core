import { ERC20_ABI } from "@/abis/ERC20_ABI";
import { mockAddresses } from "@/app/lib/utils";
import { NextResponse } from "next/server";
import { RpcProvider, Contract } from "starknet";

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const WBTC_CONTRACT_ADDRESS =
  "0x03Fe2b97C1Fd336E750087D68B9b867997Fd64a2661fF3ca5A7C771641e8e7AC";

export async function POST(req: Request) {
  try {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/wallet/btc/balance endpoint hit, START.`
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("Authorization header missing or malformed");
      return NextResponse.json(
        { message: "Unauthorized: Missing or invalid Bearer token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (token !== CAVOS_TOKEN) {
      console.warn("Invalid Bearer token provided");
      return NextResponse.json(
        { message: "Unauthorized: Invalid Bearer token" },
        { status: 401 }
      );
    }

    const { address, tokenAddress = WBTC_CONTRACT_ADDRESS } = await req.json();
    console.log("Balance request received:", { address, tokenAddress });

    if (!address) {
      console.warn("Request missing wallet address");
      return NextResponse.json(
        { message: "Missing wallet address" },
        { status: 400 }
      );
    }

    if (mockAddresses.includes(address)) {
      console.log(`Address: ${address} is in the mock test address.`);
      return NextResponse.json({
        balance: 2,
        balanceRaw: "0.00000002",
      });
    }

    const nodeUrl = process.env.RPC;
    if (!nodeUrl) {
      console.error("RPC node URL is not defined in environment variables");
      return NextResponse.json(
        { message: "RPC configuration missing" },
        { status: 500 }
      );
    }

    console.log(`Connecting to RPC provider: ${nodeUrl}`);
    const provider = new RpcProvider({ nodeUrl });

    console.log(`Instantiating contract at: ${tokenAddress}`);
    const contract = new Contract(ERC20_ABI, tokenAddress, provider);

    console.log(`Fetching balance for address: ${address}`);
    const balanceResult = await contract.balance_of(address);
    console.log(`Raw balance result: ${balanceResult.toString()}`);

    const decimals = 8;
    const balanceInUnits = Number(balanceResult) / 10 ** decimals;
    console.log(`Formatted balance: ${balanceInUnits} (decimals: ${decimals})`);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/wallet/btc/balance endpoint, FINISH.`
    );
    return NextResponse.json({
      balance: balanceInUnits,
      balanceRaw: balanceResult.toString(),
    });
  } catch (error: any) {
    console.error("Error fetching balance:", {
      message: error.message,
      stack: error.stack,
      response: error?.response?.data || null,
    });

    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
