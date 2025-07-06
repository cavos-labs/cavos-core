import { NextResponse } from 'next/server';
import { RpcProvider, Call, Account, TypedData } from 'starknet';
import { formatCall } from '@avnu/gasless-sdk';
import { toBeHex } from 'ethers';
import { validateRequest, withCORS } from '../../../../../lib/authUtils';
import {
	decryptPin,
	decryptSecretWithPin,
	formatAmount,
	parseResponse,
} from '../../../../../lib/utils';

const SECRET_TOKEN = process.env.SECRET_TOKEN!;
const AVNU_API_URL = 'https://starknet.api.avnu.fi/paymaster/v1';
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS!;

export async function POST(req: Request) {
	console.log(
		`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send endpoint hit, START.`
	);
	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, UNAUTHORIZED: Unauthorized request`
		);
		return auth.response;
	}

	try {
		const body = await req.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, REQUEST_BODY_RECEIVED: ${JSON.stringify(
				body
			)}`
		);

		const requiredFields = [
			'amount',
			'address',
			'hashedPk',
			'hashedPin',
			'receiverAddress',
		];
		const missingFields = requiredFields.filter((field) => !body[field]);

		if (missingFields.length > 0) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, MISSING_FIELDS: ${missingFields.join(
					', '
				)}`
			);
			return withCORS(
				NextResponse.json(
					{
						message: `Missing required fields: ${missingFields.join(', ')}`,
					},
					{ status: 400 }
				)
			);
		}

		const { amount, address, hashedPk, hashedPin, receiverAddress } = body;

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, DECRYPTING_CREDENTIALS: address=${address}`
		);
		const pin = decryptPin(hashedPin, SECRET_TOKEN);
		const pk = decryptSecretWithPin(hashedPk, pin);

		const provider = new RpcProvider({ nodeUrl: process.env.RPC });
		const account = new Account(provider, address, pk);

		const calls: Call[] = [];
		if (Number(amount) >= 100) {
			const adminFee = (Number(amount) * 0.002).toFixed(6);
			calls.push({
				contractAddress:
					'0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
				entrypoint: 'transfer',
				calldata: [ADMIN_ADDRESS, formatAmount(adminFee, 6)],
			});
		}
		calls.push({
			contractAddress:
				'0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
			entrypoint: 'transfer',
			calldata: [receiverAddress, formatAmount(amount, 6)],
		});

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, PREPARING_CALLS: ${JSON.stringify(
				calls
			)}`
		);
		const formattedCalls = formatCall(calls);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, BUILDING_TYPED_DATA.`
		);
		const buildTypedRes = await fetch(`${AVNU_API_URL}/build-typed-data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'api-key': process.env.AVNU_API_KEY || '',
				'ask-signature': 'false',
			},
			body: JSON.stringify({
				userAddress: address,
				calls: formattedCalls,
				accountClassHash: null,
			}),
		});

		if (!buildTypedRes.ok) {
			const errorText = await buildTypedRes.text();
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, TYPED_DATA_BUILD_ERROR: ${errorText}`
			);
			throw new Error(`build-typed-data error: ${errorText}`);
		}

		const typedData: TypedData = await parseResponse(buildTypedRes);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, TYPED_DATA_BUILT_SUCCESSFULLY.`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, SIGNING_TYPED_DATA.`
		);
		let signature = await account.signMessage(typedData);
		if (Array.isArray(signature)) {
			signature = signature.map((sig) => toBeHex(BigInt(sig)));
		} else if (signature.r && signature.s) {
			signature = [
				toBeHex(BigInt(signature.r)),
				toBeHex(BigInt(signature.s)),
			];
		}
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, SIGNATURE_GENERATED: ${JSON.stringify(
				signature
			)}`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, EXECUTING_TRANSACTION.`
		);
		const executeRes = await fetch(`${AVNU_API_URL}/execute`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'api-key': process.env.AVNU_API_KEY || '',
				'ask-signature': 'false',
			},
			body: JSON.stringify({
				userAddress: address,
				typedData: JSON.stringify(typedData),
				signature,
				deploymentData: null,
			}),
		});

		if (!executeRes.ok) {
			const errorText = await executeRes.text();
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, EXECUTION_ERROR: ${errorText}`
			);
			throw new Error(`Execute failed: ${errorText}`);
		}

		const result = await executeRes.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, TRANSACTION_EXECUTED_SUCCESSFULLY: ${JSON.stringify(
				result
			)}`
		);

		if (!result.transactionHash) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, MISSING_TRANSACTION_HASH: ${JSON.stringify(
					result
				)}`
			);
			throw new Error('Missing transactionHash in response');
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, FINISH.`
		);
		return withCORS(NextResponse.json({ result: result.transactionHash }));
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/send, UNHANDLED_ERROR: ${
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
