import { NextResponse } from 'next/server';
import { RpcProvider, Contract } from 'starknet';
import { validateRequest, withCORS } from '../../../../../lib/authUtils';
import { ERC20_ABI } from '../../../../../../abis/ERC20_ABI';

const USDC_CONTRACT_ADDRESS =
	'0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';

export async function POST(req: Request) {
	console.log(
		`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance endpoint hit, START.`
	);
	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, UNAUTHORIZED: Unauthorized request`
		);
		return auth.response;
	}

	try {
		const { address, tokenAddress = USDC_CONTRACT_ADDRESS } =
			await req.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, REQUEST_RECEIVED: address=${address}, tokenAddress=${tokenAddress}`
		);

		if (!address) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, MISSING_PARAMETER: Missing wallet address in request body`
			);
			return withCORS(
				NextResponse.json(
					{ message: 'Missing wallet address' },
					{ status: 400 }
				)
			);
		}

		const nodeUrl = process.env.RPC;
		if (!nodeUrl) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, CONFIG_ERROR: Missing RPC URL in environment variables`
			);
			return withCORS(
				NextResponse.json(
					{ message: 'Missing RPC URL configuration' },
					{ status: 500 }
				)
			);
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, INITIALIZING_PROVIDER: RPC=${nodeUrl}`
		);
		const provider = new RpcProvider({ nodeUrl });

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, INSTANTIATING_CONTRACT: tokenAddress=${tokenAddress}`
		);
		const contract = new Contract(ERC20_ABI, tokenAddress, provider);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, FETCHING_BALANCE: address=${address}`
		);
		const balanceResult = await contract.balance_of(address);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, RAW_BALANCE_RESULT: ${balanceResult.toString()}`
		);

		const decimals = 6;
		const balanceInUnits = Number(balanceResult) / 10 ** decimals;
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, BALANCE_CONVERTED: ${balanceInUnits} (decimals: ${decimals})`
		);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, FINISH.`
		);
		return withCORS(
			NextResponse.json({
				balance: balanceInUnits,
				balanceRaw: balanceResult.toString(),
			})
		);
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/balance, ERROR: ${
				error.message || error
			}`
		);
		return withCORS(
			NextResponse.json(
				{ message: error.message || 'Internal Server Error' },
				{ status: 500 }
			)
		);
	}
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
	console.log(
		`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance endpoint hit, START.`
	);

	const auth = validateRequest(request);
	if (!auth.valid) {
		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, UNAUTHORIZED: Unauthorized request`
		);
		return auth.response;
	}

	try {
		const { searchParams } = new URL(request.url);
		const userAddress = searchParams.get('userAddress');
		const assetAddress = searchParams.get('assetAddress');
		const assetDecimals = searchParams.get('assetDecimals');

		if (!userAddress || !assetAddress || !assetDecimals) {
			console.log(
				`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, MISSING_PARAMETERS: userAddress=${userAddress}, assetAddress=${assetAddress}, assetDecimals=${assetDecimals}`
			);

			return withCORS(
				NextResponse.json(
					{
						message:
							'Missing required parameters: userAddress, assetAddress, assetDecimals',
					},
					{ status: 400 }
				)
			);
		}

		const nodeUrl = process.env.RPC;
		if (!nodeUrl) {
			console.log(
				`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, CONFIG_ERROR: Missing RPC URL`
			);
			return withCORS(
				NextResponse.json(
					{ message: 'Missing RPC URL configuration' },
					{ status: 500 }
				)
			);
		}

		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, CONNECTING_RPC: ${nodeUrl}`
		);
		const provider = new RpcProvider({ nodeUrl });

		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, LOADING_CONTRACT: assetAddress=${assetAddress}`
		);
		const contract = new Contract(ERC20_ABI, assetAddress, provider);

		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, FETCHING_BALANCE: userAddress=${userAddress}`
		);
		const balanceResult = await contract.balance_of(userAddress);
		const raw = balanceResult.toString();
		const balance = Number(raw) / 10 ** Number(assetDecimals);

		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, BALANCE_RESULT: raw=${raw}, parsed=${balance}`
		);
		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, FINISH.`
		);

		return withCORS(
			NextResponse.json({
				balance,
				balanceRaw: raw,
			})
		);
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [GET] /api/v1/wallet/usd/balance, ERROR: ${
				error.message || error
			}`
		);

		return withCORS(
			NextResponse.json(
				{ message: error.message || 'Internal Server Error' },
				{ status: 500 }
			)
		);
	}
}
