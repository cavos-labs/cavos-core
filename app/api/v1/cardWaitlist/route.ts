import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../lib/authUtils';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
	throw new Error('Missing required Supabase environment variables');
}
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);

export async function POST(req: Request) {
	console.log(
		`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist hit, START.`
	);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist, AUTH INVALID.`
		);
		return auth.response;
	}

	let email: string | undefined;
	let country: string | undefined;
	try {
		const body = await req.json();
		email = body.email;
		country = body.country;
	} catch (e) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist, INVALID JSON BODY.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!email || !country) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist, MISSING FIELDS.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Missing email or country in request body' },
				{ status: 400 }
			)
		);
	}

	const { error } = await supabase.from('card_waitlist').insert([
		{
			email: email.toLowerCase(),
			country: country,
		},
	]);

	if (error) {
		console.log(
			`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist, SUPABASE ERROR: ${error.message}`
		);
		return withCORS(
			NextResponse.json({ message: error.message }, { status: 500 })
		);
	}

	console.log(
		`[${new Date().toISOString()}] [POST] /api/v1/cardWaitlist, SUCCESS.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'Successfully added to card waitlist' },
			{ status: 201 }
		)
	);
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
