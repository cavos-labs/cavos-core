import { NextResponse } from 'next/server';
import { RpcProvider, Contract } from 'starknet';
import { ERC20_ABI } from '../../../../../../abis/ERC20_ABI';

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const WBTC_CONTRACT_ADDRESS =
	'0x03Fe2b97C1Fd336E750087D68B9b867997Fd64a2661fF3ca5A7C771641e8e7AC';

export async function POST(req: Request) {
	try {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Start`
		);

		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.warn(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Unauthorized: Missing or invalid Bearer token`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Missing or invalid Bearer token' },
				{ status: 401 }
			);
		}

		const token = authHeader.split(' ')[1];
		if (token !== CAVOS_TOKEN) {
			console.warn(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Unauthorized: Invalid Bearer token`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Invalid Bearer token' },
				{ status: 401 }
			);
		}

		const { address, tokenAddress = WBTC_CONTRACT_ADDRESS } =
			await req.json();

		if (!address) {
			console.warn(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Missing wallet address`
			);
			return NextResponse.json(
				{ message: 'Missing wallet address' },
				{ status: 400 }
			);
		}

		const nodeUrl = process.env.RPC;
		if (!nodeUrl) {
			console.error(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - RPC configuration missing`
			);
			return NextResponse.json(
				{ message: 'RPC configuration missing' },
				{ status: 500 }
			);
		}

		const provider = new RpcProvider({ nodeUrl });
		const contract = new Contract(ERC20_ABI, tokenAddress, provider);
		const balanceResult = await contract.balance_of(address);

		const decimals = 8;
		const balanceInUnits = Number(balanceResult) / 10 ** decimals;

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Success for address: ${address}`
		);

		return NextResponse.json({
			balance: balanceInUnits,
			balanceRaw: balanceResult.toString(),
		});
	} catch (error: any) {
		console.error(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/btc/balance - Error: ${error.message}`
		);
		return NextResponse.json(
			{ message: error.message || 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
