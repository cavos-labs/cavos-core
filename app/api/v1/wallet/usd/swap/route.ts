import { NextResponse } from 'next/server';
import { RpcProvider, Account, TypedData } from 'starknet';
import { toBeHex } from 'ethers';
import axios from 'axios';

import {
	decryptPin,
	decryptSecretWithPin,
	parseResponse,
} from '../../../../../lib/utils';

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

export async function POST(req: Request) {
	try {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap endpoint hit, START.`
		);
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, UNAUTHORIZED: Missing or invalid Authorization header`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Missing or invalid Bearer token' },
				{ status: 401 }
			);
		}

		const token = authHeader.split(' ')[1];
		if (token !== CAVOS_TOKEN) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, UNAUTHORIZED: Invalid Bearer token provided`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Invalid Bearer token' },
				{ status: 401 }
			);
		}

		const body = await req.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, REQUEST_BODY_RECEIVED: ${JSON.stringify(
				body
			)}`
		);

		const {
			address,
			hashedPk,
			hashedPin,
			sellTokenAddress,
			buyTokenAddress,
			amount,
		} = body;

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, DECRYPTING_CREDENTIALS.`
		);
		const pin = decryptPin(hashedPin, SECRET_TOKEN);
		const pk = decryptSecretWithPin(hashedPk, pin);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, DECRYPTION_SUCCESSFUL.`
		);

		const provider = new RpcProvider({ nodeUrl: process.env.RPC });

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, FETCHING_AVNU_QUOTES.`
		);
		const quotes = (
			await axios.get(
				`https://starknet.api.avnu.fi/internal/swap/quotes-with-prices?sellTokenAddress=${sellTokenAddress}&buyTokenAddress=${buyTokenAddress}&sellAmount=${toBeHex(
					amount
				)}&takerAddress=${address}&size=1&integratorName=AVNU%20Portal`
			)
		).data.quotes;

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, QUOTE_RECEIVED: ${JSON.stringify(
				quotes[0]
			)}`
		);

		const account = new Account(provider, address, pk);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, BUILDING_SWAP_TYPED_DATA.`
		);
		const swapTypedDataResponse = await fetch(
			'https://starknet.api.avnu.fi/swap/v2/build-typed-data',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': process.env.AVNU_API_KEY || '',
					'ask-signature': 'false',
				},
				body: JSON.stringify({
					quoteId: quotes[0].quoteId,
					takerAddress: address,
					slippage: 0.05,
					includeApprove: true,
					gasTokenAddress:
						'0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
					maxGasTokenAmount: toBeHex(1000000),
				}),
			}
		);

		if (!swapTypedDataResponse.ok) {
			const errorText = await swapTypedDataResponse.text();
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, AVNU_TYPED_DATA_ERROR: ${errorText}`
			);
			throw new Error(`API error swap typedata: ${errorText}`);
		}

		const swapTypedData: TypedData = await parseResponse(
			swapTypedDataResponse
		);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, TYPED_DATA_PARSED: ${JSON.stringify(
				swapTypedData
			)}`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, SIGNING_TYPED_DATA.`
		);
		let userSignature = await account.signMessage(swapTypedData);

		if (Array.isArray(userSignature)) {
			userSignature = userSignature.map((sig) => toBeHex(BigInt(sig)));
		} else if (userSignature.r && userSignature.s) {
			userSignature = [
				toBeHex(BigInt(userSignature.r)),
				toBeHex(BigInt(userSignature.s)),
			];
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, SIGNATURE_GENERATED: ${JSON.stringify(
				userSignature
			)}`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, EXECUTING_SWAP_TRANSACTION.`
		);
		const swapExecuteTransaction = await fetch(
			'https://starknet.api.avnu.fi/swap/v2/execute',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': process.env.AVNU_API_KEY || '',
					'ask-signature': 'false',
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
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, SWAP_EXECUTION_ERROR: ${errorText}`
			);
			return NextResponse.json({ result: false });
		}

		const swapResult = await swapExecuteTransaction.json();
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, SWAP_EXECUTED_SUCCESSFULLY: transactionHash=${
				swapResult.transactionHash
			}`
		);

		if (!swapResult.transactionHash) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, MISSING_TRANSACTION_HASH.`
			);
			throw new Error('Missing transaction hash in AVNU response.');
		}
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, FINISH.`
		);
		return NextResponse.json({ result: swapResult.transactionHash });
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/usd/swap, UNHANDLED_ERROR: ${
				error.message || error
			}`
		);
		return NextResponse.json(
			{ message: error.message || 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
