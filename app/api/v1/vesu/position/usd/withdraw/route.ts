import { NextResponse } from 'next/server';
import { RpcProvider, Call, Account, TypedData, cairo } from 'starknet';
import { formatCall } from '@avnu/gasless-sdk';
import {
	decryptPin,
	decryptSecretWithPin,
	formatAmount,
	parseResponse,
} from '../../../../../../lib/utils';
import { toBeHex, toBigInt } from 'ethers';
import axios from 'axios';

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

export async function POST(req: Request) {
	console.log(
		`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw endpoint hit, START.`
	);
	try {
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, UNAUTHORIZED: Missing or malformed Authorization header`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Missing or invalid Bearer token' },
				{ status: 401 }
			);
		}

		const token = authHeader.split(' ')[1];
		if (token !== CAVOS_TOKEN) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, UNAUTHORIZED: Invalid Bearer token provided`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Invalid Bearer token' },
				{ status: 401 }
			);
		}

		const { address, hashedPk, hashedPin, poolId } = await req.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, REQUEST_RECEIVED: address=${address}, poolId=${poolId}`
		);

		const pin = decryptPin(hashedPin, SECRET_TOKEN);
		const pk = decryptSecretWithPin(hashedPk, pin);

		const provider = new RpcProvider({ nodeUrl: process.env.RPC });
		const userPositions = (
			await axios.get(
				`https://api.vesu.xyz/positions?walletAddress=${address}&type=earn`
			)
		).data.data;

		const position = userPositions.find(
			(item: { type: string; pool: { id: string } }) =>
				item.pool.id === poolId
		);

		if (!position) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, POSITION_NOT_FOUND: poolId=${poolId}`
			);
			return NextResponse.json(
				{ message: 'No position found for the given poolId' },
				{ status: 404 }
			);
		}

		const account = new Account(provider, address, pk);

		let calls: Call[] = [
			{
				contractAddress:
					'0x048f4e75c12ca9d35d6172b1cb5f1f70b094888003f9c94fe19f12a67947fd6d',
				entrypoint: 'redeem',
				calldata: [
					position.collateralShares.value,
					'0',
					address,
					address,
				],
			},
		];

		calls = formatCall(calls);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, CALLS_FORMATTED: ${JSON.stringify(
				calls,
				null,
				2
			)}`
		);

		const typeDataResponse = await fetch(
			'https://starknet.api.avnu.fi/paymaster/v1/build-typed-data',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': process.env.AVNU_API_KEY || '',
					'ask-signature': 'false',
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
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, TYPED_DATA_FETCH_ERROR: ${errorText}`
			);
			throw new Error(`API error typedata: ${errorText}`);
		}

		const typeData: TypedData = await parseResponse(typeDataResponse);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, TYPED_DATA_RECEIVED: ${JSON.stringify(
				typeData,
				null,
				2
			)}`
		);

		let userSignature = await account.signMessage(typeData);
		if (Array.isArray(userSignature)) {
			userSignature = userSignature.map((sig) => toBeHex(BigInt(sig)));
		} else if (userSignature.r && userSignature.s) {
			userSignature = [
				toBeHex(BigInt(userSignature.r)),
				toBeHex(BigInt(userSignature.s)),
			];
		}
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, USER_SIGNATURE_GENERATED: ${JSON.stringify(
				userSignature
			)}`
		);

		const executeTransaction = await fetch(
			'https://starknet.api.avnu.fi/paymaster/v1/execute',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': process.env.AVNU_API_KEY || '',
					'ask-signature': 'true',
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
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, TRANSACTION_EXECUTION_ERROR: ${errorText}`
			);
			throw new Error(`Execution API error: ${errorText}`);
		}

		const result = await executeTransaction.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, EXECUTION_RESPONSE: ${JSON.stringify(
				result
			)}`
		);

		if (!result.transactionHash) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, MISSING_TRANSACTION_HASH.`
			);
			throw new Error('TxHash not found');
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, TRANSACTION_SUCCESSFUL: ${
				result.transactionHash
			}`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, FINISH.`
		);
		return NextResponse.json({
			result: result.transactionHash,
			amount: position.collateral.value / 10 ** 6,
		});
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/vesu/position/usd/withdraw, UNHANDLED_ERROR: ${
				error.message || error
			}`
		);
		return NextResponse.json(
			{ message: error.message || 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
