import { NextResponse } from 'next/server';
import {
	RpcProvider,
	stark,
	ec,
	CairoCustomEnum,
	CairoOption,
	CallData,
	Account,
	hash,
} from 'starknet';
import { decryptPin, encryptSecretWithPin } from '../../../../lib/utils';

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

export async function POST(req: Request) {
	try {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create endpoint hit, START.`
		);
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, UNAUTHORIZED: Missing or invalid Authorization header`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Missing or invalid Bearer token' },
				{ status: 401 }
			);
		}

		const token = authHeader.split(' ')[1];
		if (token !== CAVOS_TOKEN) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, UNAUTHORIZED: Invalid token received=${token}, expected=${CAVOS_TOKEN}`
			);
			return NextResponse.json(
				{ message: 'Unauthorized: Invalid Bearer token' },
				{ status: 401 }
			);
		}

		const body = await req.json();
		let { pin } = body;
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, REQUEST_RECEIVED: encrypted PIN provided`
		);

		pin = decryptPin(pin, SECRET_TOKEN);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, PIN_DECRYPTED_SUCCESSFULLY.`
		);

		const provider = new RpcProvider({ nodeUrl: process.env.RPC });
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, STARKNET_PROVIDER_INITIALIZED.`
		);

		const argentXaccountClassHash =
			'0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f';
		const privateKeyAX = stark.randomAddress();
		const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, STARKNET_KEY_PAIR_GENERATED.`
		);

		const axSigner = new CairoCustomEnum({
			Starknet: { pubkey: starkKeyPubAX },
		});
		const axGuardian = new CairoOption(1);
		const ArgentAAConstructorCallData = CallData.compile({
			owner: axSigner,
			guardian: axGuardian,
		});

		const AXcontractAddress = hash.calculateContractAddressFromHash(
			argentXaccountClassHash,
			argentXaccountClassHash,
			ArgentAAConstructorCallData,
			0
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, CONTRACT_ADDRESS_COMPUTED: ${AXcontractAddress}`
		);

		const deploymentData = {
			class_hash: argentXaccountClassHash,
			salt: argentXaccountClassHash,
			unique: '0x0',
			calldata: ArgentAAConstructorCallData.map((x) => {
				const hex = BigInt(x).toString(16);
				return `0x${hex}`;
			}),
		};

		const account = new Account(provider, AXcontractAddress, privateKeyAX);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, ACCOUNT_INSTANCE_CREATED_FOR_DEPLOYMENT.`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, BUILDING_TYPED_DATA.`
		);
		const typeDataResponse = await fetch(
			'https://starknet.api.avnu.fi/paymaster/v1/build-typed-data',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': process.env.AVNU_API_KEY || '',
				},
				body: JSON.stringify({
					userAddress: AXcontractAddress,
					accountClassHash: argentXaccountClassHash,
					deploymentData,
					calls: [],
				}),
			}
		);

		if (!typeDataResponse.ok) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, TYPED_DATA_BUILD_FAILED: ${
					typeDataResponse.statusText
				}`
			);
			return NextResponse.json(
				{ data: typeDataResponse.statusText },
				{ status: 500 }
			);
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, TYPED_DATA_BUILT_SUCCESSFULLY.`
		);

		const encryptedPK = encryptSecretWithPin(pin, privateKeyAX);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, PRIVATE_KEY_ENCRYPTED_WITH_PIN.`
		);

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, DEPLOYING_ACCOUNT.`
		);
		const executeResponse = await fetch(
			'https://starknet.api.avnu.fi/paymaster/v1/deploy-account',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': process.env.AVNU_API_KEY || '',
				},
				body: JSON.stringify({
					userAddress: AXcontractAddress,
					deploymentData: deploymentData,
				}),
			}
		);

		if (!executeResponse.ok) {
			console.log(
				`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, ACCOUNT_DEPLOYMENT_FAILED: ${
					executeResponse.statusText
				}`
			);
			return NextResponse.json(
				{ data: executeResponse.statusText },
				{ status: 500 }
			);
		}

		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, ACCOUNT_DEPLOYED_SUCCESSFULLY.`
		);
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, FINISH.`
		);
		return NextResponse.json({
			public_key: starkKeyPubAX,
			private_key: encryptedPK,
			address: AXcontractAddress,
		});
	} catch (error: any) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/wallet/create, UNHANDLED_ERROR: ${
				error.message || error
			}`
		);
		return NextResponse.json(
			{ message: error.message || 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
