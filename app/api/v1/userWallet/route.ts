import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../lib/authUtils';

const supabase = createClient(
	process.env.SUPABASE_URL || '',
	process.env.SUPABASE_ANON_KEY || ''
);

export async function GET(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [GET] /api/v1/userWallet - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [GET] /api/v1/userWallet - Auth invalid.`);
		return auth.response;
	}

	const { searchParams } = new URL(req.url);
	const address = searchParams.get('address');
	const query = searchParams.get('query');

	if (query) {
		// Search by user_name (case-insensitive, partial match)
		const { data, error } = await supabase
			.from('user_wallet')
			.select('user_name, address')
			.ilike('user_name', `%${query.trim()}%`)
			.not('user_name', 'is', null)
			.limit(20);

		if (error) {
			console.log(
				`[${now}] [GET] /api/v1/userWallet - Supabase error (search): ${error.message}`
			);
			return withCORS(
				NextResponse.json({ message: error.message }, { status: 500 })
			);
		}

		console.log(`[${now}] [GET] /api/v1/userWallet - Search success.`);
		return withCORS(NextResponse.json({ results: data }, { status: 200 }));
	}

	if (!address) {
		console.log(`[${now}] [GET] /api/v1/userWallet - Missing address.`);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing address in query parameters' },
				{ status: 400 }
			)
		);
	}

	const normalizedAddress = address.trim().toLowerCase();

	const { data: recipientUser, error: recipientError } = await supabase
		.from('user_wallet')
		.select('user_id')
		.eq('address', normalizedAddress)
		.single();

	if (recipientError) {
		console.log(
			`[${now}] [GET] /api/v1/userWallet - Supabase error: ${recipientError.message}`
		);
		return withCORS(
			NextResponse.json(
				{ message: recipientError.message },
				{ status: 500 }
			)
		);
	}

	console.log(`[${now}] [GET] /api/v1/userWallet - Success.`);
	return withCORS(
		NextResponse.json({ user_id: recipientUser?.user_id }, { status: 200 })
	);
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
