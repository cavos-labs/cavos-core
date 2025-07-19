import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../lib/authUtils';

const supabase = createClient(
	process.env.SUPABASE_URL || '',
	process.env.SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [POST] /api/v1/transaction - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [POST] /api/v1/transaction - Auth invalid.`);
		return auth.response;
	}

	let user_id: string | undefined;
	let amount: number | undefined;
	let tx_hash: string | undefined;
	let type: string | undefined;

	try {
		const body = await req.json();
		user_id = body.user_id;
		amount = body.amount;
		tx_hash = body.tx_hash;
		type = body.type;
	} catch (e) {
		console.log(
			`[${now}] [POST] /api/v1/transaction - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!user_id || amount === undefined || !tx_hash || !type) {
		console.log(
			`[${now}] [POST] /api/v1/transaction - Missing user_id, amount, tx_hash, or type.`
		);
		return withCORS(
			NextResponse.json(
				{
					message:
						'Missing user_id, amount, tx_hash, or type in request body',
				},
				{ status: 400 }
			)
		);
	}

	const { error: txError } = await supabase.from('transaction').insert([
		{
			auth0_id: user_id,
			type: type,
			amount: amount,
			tx_hash: tx_hash,
		},
	]);

	if (txError) {
		console.log(
			`[${now}] [POST] /api/v1/transaction - Supabase error: ${txError.message}`
		);
		return withCORS(
			NextResponse.json({ message: txError.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [POST] /api/v1/transaction - Transaction recorded successfully.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'Transaction recorded successfully' },
			{ status: 201 }
		)
	);
}

export async function DELETE(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [DELETE] /api/v1/transaction - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [DELETE] /api/v1/transaction - Auth invalid.`);
		return auth.response;
	}

	let user_id: string | undefined;
	try {
		const body = await req.json();
		user_id = body.user_id;
	} catch (e) {
		console.log(
			`[${now}] [DELETE] /api/v1/transaction - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!user_id) {
		console.log(`[${now}] [DELETE] /api/v1/transaction - Missing user_id.`);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing user_id in request body' },
				{ status: 400 }
			)
		);
	}

	const { error: txError } = await supabase
		.from('transaction')
		.delete()
		.eq('auth0_id', user_id);

	if (txError) {
		console.log(
			`[${now}] [DELETE] /api/v1/transaction - Supabase error: ${txError.message}`
		);
		return withCORS(
			NextResponse.json({ message: txError.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [DELETE] /api/v1/transaction - Transaction(s) deleted successfully.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'Transaction(s) deleted successfully' },
			{ status: 200 }
		)
	);
}

export async function GET(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [GET] /api/v1/transaction - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [GET] /api/v1/transaction - Auth invalid.`);
		return auth.response;
	}

	const { searchParams } = new URL(req.url);
	const user_id = searchParams.get('user_id');

	if (!user_id) {
		console.log(`[${now}] [GET] /api/v1/transaction - Missing user_id.`);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing user_id in query parameters' },
				{ status: 400 }
			)
		);
	}

	const { data, error } = await supabase
		.from('transaction')
		.select('*')
		.eq('auth0_id', user_id)
		.order('created_at', { ascending: false });

	if (error) {
		console.log(
			`[${now}] [GET] /api/v1/transaction - Supabase error: ${error.message}`
		);
		return withCORS(
			NextResponse.json({ message: error.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [GET] /api/v1/transaction - Transactions fetched successfully.`
	);
	return withCORS(NextResponse.json({ data }));
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
