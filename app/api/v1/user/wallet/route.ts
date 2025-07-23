import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../../lib/authUtils';

const supabase = createClient(
	process.env.SUPABASE_URL || '',
	process.env.SUPABASE_ANON_KEY || ''
);

export async function GET(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [GET] /api/v1/user/wallet - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [GET] /api/v1/user/wallet - Auth invalid.`);
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
				`[${now}] [GET] /api/v1/user/wallet - Supabase error (search): ${error.message}`
			);
			return withCORS(
				NextResponse.json({ message: error.message }, { status: 500 })
			);
		}

		console.log(`[${now}] [GET] /api/v1/user/wallet - Search success.`);
		return withCORS(NextResponse.json({ results: data }, { status: 200 }));
	}

	if (!address) {
		console.log(`[${now}] [GET] /api/v1/user/wallet - Missing address.`);
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
		.maybeSingle();

	if (recipientError) {
		console.log(
			`[${now}] [GET] /api/v1/user/wallet - Supabase error: ${recipientError.message}`
		);
		return withCORS(
			NextResponse.json(
				{ message: recipientError.message },
				{ status: 500 }
			)
		);
	}

	if (!recipientUser) {
		console.log(`[${now}] [GET] /api/v1/user/wallet - User not found.`);
		return withCORS(
			NextResponse.json({ message: 'User not found' }, { status: 404 })
		);
	}

	console.log(`[${now}] [GET] /api/v1/user/wallet - Success.`);
	return withCORS(
		NextResponse.json({ user_id: recipientUser?.user_id }, { status: 200 })
	);
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
