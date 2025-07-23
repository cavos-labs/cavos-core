import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest, withCORS } from '../../../../lib/authUtils';

const supabase = createClient(
	process.env.SUPABASE_URL || '',
	process.env.SUPABASE_ANON_KEY || ''
);

export async function GET(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [GET] /api/v1/invitation/code - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [GET] /api/v1/invitation/code - Auth invalid.`);
		return auth.response;
	}

	const { searchParams } = new URL(req.url);
	const user_id = searchParams.get('user_id');
	const invitation_code = searchParams.get('invitation_code');

	if (user_id) {
		const { data: existingCode, error: checkError } = await supabase
			.from('code')
			.select('*')
			.eq('auth0_id', user_id)
			.maybeSingle();

		if (checkError) {
			console.log(
				`[${now}] [GET] /api/v1/invitation/code - Supabase error: ${checkError.message}`
			);
			return withCORS(
				NextResponse.json(
					{ message: checkError.message },
					{ status: 500 }
				)
			);
		}

		if (!existingCode) {
			return withCORS(
				NextResponse.json(
					{ message: 'Invitation code not found' },
					{ status: 404 }
				)
			);
		}

		console.log(
			`[${now}] [GET] /api/v1/invitation/code - Success (by user_id).`
		);
		return withCORS(
			NextResponse.json({ code: existingCode }, { status: 200 })
		);
	} else if (invitation_code) {
		// New logic: fetch by invitation_code (case-insensitive)
		const { data: codeData, error: codeError } = await supabase
			.from('code')
			.select('*')
			.eq('invitation_code', invitation_code.toUpperCase())
			.single();

		if (codeError) {
			console.log(
				`[${now}] [GET] /api/v1/invitation/code - Supabase error: ${codeError.message}`
			);
			return withCORS(
				NextResponse.json(
					{ message: codeError.message },
					{ status: 500 }
				)
			);
		}

		console.log(
			`[${now}] [GET] /api/v1/invitation/code - Success (by invitation_code).`
		);
		return withCORS(NextResponse.json({ code: codeData }, { status: 200 }));
	} else {
		console.log(
			`[${now}] [GET] /api/v1/invitation/code - Missing parameters.`
		);
		return withCORS(
			NextResponse.json(
				{
					message:
						'Missing user_id or invitation_code in query parameters',
				},
				{ status: 400 }
			)
		);
	}
}

export async function POST(req: Request) {
	const now = new Date().toISOString();
	console.log(`[${now}] [POST] /api/v1/invitation/code - Request received.`);

	const auth = validateRequest(req);
	if (!auth.valid) {
		console.log(`[${now}] [POST] /api/v1/invitation/code - Auth invalid.`);
		return auth.response;
	}

	let user_id: string | undefined;
	let invitation_code: string | undefined;
	try {
		const body = await req.json();
		user_id = body.user_id;
		invitation_code = body.invitation_code;
	} catch (e) {
		console.log(
			`[${now}] [POST] /api/v1/invitation/code - Invalid or missing JSON body.`
		);
		return withCORS(
			NextResponse.json(
				{ message: 'Invalid or missing JSON body' },
				{ status: 400 }
			)
		);
	}

	if (!user_id || !invitation_code) {
		console.log(
			`[${now}] [POST] /api/v1/invitation/code - Missing user_id or invitation_code.`
		);
		return withCORS(
			NextResponse.json(
				{
					message:
						'Missing user_id or invitation_code in request body',
				},
				{ status: 400 }
			)
		);
	}

	const { error: insertError } = await supabase
		.from('code')
		.insert([{ auth0_id: user_id, invitation_code }]);

	if (insertError) {
		console.log(
			`[${now}] [POST] /api/v1/invitation/code - Supabase error: ${insertError.message}`
		);
		return withCORS(
			NextResponse.json({ message: insertError.message }, { status: 500 })
		);
	}

	console.log(
		`[${now}] [POST] /api/v1/invitation/code - Invitation code inserted successfully.`
	);
	return withCORS(
		NextResponse.json(
			{ message: 'Invitation code inserted successfully' },
			{ status: 201 }
		)
	);
}

export async function OPTIONS(req: Request) {
	return withCORS(new NextResponse(null, { status: 204 }));
}
