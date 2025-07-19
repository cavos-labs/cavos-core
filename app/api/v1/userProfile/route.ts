import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../lib/authUtils';

const supabase = createClient(
	process.env.SUPABASE_URL || '',
	process.env.SUPABASE_ANON_KEY || ''
);

export async function PUT(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [PUT] /api/v1/username - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [PUT] /api/v1/username - Auth invalid.`);
		return auth.response;
	}

	let user_id: string | undefined;
	let username: string | undefined;
	try {
		const body = await req.json();
		user_id = body.user_id;
		username = body.username;
	} catch (e) {
		console.log(
			`[${now}] [PUT] /api/v1/username - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!user_id || !username) {
		console.log(
			`[${now}] [PUT] /api/v1/username - Missing user_id or username.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing user_id or username in request body' },
				{ status: 400 }
			)
		);
	}

	const { error } = await supabase
		.from('user_profile')
		.update({ username: username.trim() })
		.eq('auth0_id', user_id);

	if (error) {
		console.log(
			`[${now}] [PUT] /api/v1/username - Supabase error: ${error.message}`
		);
		return withCORS(
			NextResponse.json({ message: error.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [PUT] /api/v1/username - Username updated successfully.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'Username updated successfully' },
			{ status: 200 }
		)
	);
}

export async function DELETE(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [DELETE] /api/v1/username - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [DELETE] /api/v1/username - Auth invalid.`);
		return auth.response;
	}

	let user_id: string | undefined;
	try {
		const body = await req.json();
		user_id = body.user_id;
	} catch (e) {
		console.log(
			`[${now}] [DELETE] /api/v1/username - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!user_id) {
		console.log(`[${now}] [DELETE] /api/v1/username - Missing user_id.`);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing user_id in request body' },
				{ status: 400 }
			)
		);
	}

	const { error: walletError } = await supabase
		.from('user_profile')
		.delete()
		.eq('auth0_id', user_id);

	if (walletError) {
		console.log(
			`[${now}] [DELETE] /api/v1/username - Supabase error: ${walletError.message}`
		);
		return withCORS(
			NextResponse.json({ message: walletError.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [DELETE] /api/v1/username - User profile deleted successfully.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'User profile deleted successfully' },
			{ status: 200 }
		)
	);
}

export async function GET(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [GET] /api/v1/userProfile - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [GET] /api/v1/userProfile - Auth invalid.`);
		return auth.response;
	}

	const { searchParams } = new URL(req.url);
	const user_id = searchParams.get('user_id');
	const list = searchParams.get('list');

	if (list === '1') {
		// List up to 100 profiles with username and address, where username is not null
		const { data, error } = await supabase
			.from('user_profile')
			.select('username, address')
			.not('username', 'is', null)
			.limit(100);

		if (error) {
			console.log(
				`[${now}] [GET] /api/v1/userProfile - Supabase error (list): ${error.message}`
			);
			return withCORS(
				NextResponse.json({ message: error.message }, { status: 500 })
			);
		}

		console.log(`[${now}] [GET] /api/v1/userProfile - List success.`);
		return withCORS(NextResponse.json({ profiles: data }, { status: 200 }));
	}

	if (!user_id) {
		console.log(`[${now}] [GET] /api/v1/userProfile - Missing user_id.`);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing user_id in query parameters' },
				{ status: 400 }
			)
		);
	}

	const { data, error } = await supabase
		.from('user_profile')
		.select('username')
		.eq('auth0_id', user_id)
		.single();

	if (error) {
		console.log(
			`[${now}] [GET] /api/v1/userProfile - Supabase error: ${error.message}`
		);
		return withCORS(
			NextResponse.json({ message: error.message }, { status: 500 })
		);
	}

	console.log(`[${now}] [GET] /api/v1/userProfile - Success.`);
	return withCORS(
		NextResponse.json({ username: data?.username }, { status: 200 })
	);
}

export async function POST(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [POST] /api/v1/userProfile - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [POST] /api/v1/userProfile - Auth invalid.`);
		return auth.response;
	}

	let profileData: any;
	try {
		profileData = await req.json();
	} catch (e) {
		console.log(
			`[${now}] [POST] /api/v1/userProfile - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!profileData || !profileData.auth0_id) {
		console.log(
			`[${now}] [POST] /api/v1/userProfile - Missing auth0_id in profileData.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing auth0_id in profileData' },
				{ status: 400 }
			)
		);
	}

	// Upsert the full profile data
	const { data, error } = await supabase
		.from('user_profile')
		.upsert(profileData)
		.select()
		.single();

	if (error) {
		console.log(
			`[${now}] [POST] /api/v1/userProfile - Supabase error (upsert): ${error.message}`
		);
		return withCORS(
			NextResponse.json({ message: error.message }, { status: 500 })
		);
	}

	// Insert phone_number and auth0_id as a new record (if needed)
	if (profileData.phone_number && profileData.auth0_id) {
		const { error: insertError } = await supabase
			.from('user_profile')
			.insert({
				phone_number: profileData.phone_number,
				auth0_id: profileData.auth0_id,
			});

		if (insertError) {
			console.log(
				`[${now}] [POST] /api/v1/userProfile - Supabase error (insert): ${insertError.message}`
			);
			// Optionally, you can return here or just log the error and continue
			return withCORS(
				NextResponse.json(
					{ message: insertError.message },
					{ status: 500 }
				)
			);
		}
	}

	console.log(
		`[${now}] [POST] /api/v1/userProfile - Profile upserted and phone number inserted successfully.`
	);
	return withCORS(NextResponse.json({ profile: data }, { status: 201 }));
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
