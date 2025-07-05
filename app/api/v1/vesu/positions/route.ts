import { NextResponse } from "next/server";
import axios from "axios";
import { validateRequest, withCORS } from "../../../../lib/authUtils";

export async function POST(req: Request) {
  console.log(
    `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions hit, START.`
  );
  const auth = validateRequest(req);
  if (!auth.valid) {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, UNAUTHORIZED.`
    );
    return auth.response;
  }

  try {
    const { address, pool } = await req.json();
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, REQUEST_RECEIVED: ${JSON.stringify(
        { address, pool }
      )}`
    );

    if (!address) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, MISSING_PARAMETER: address`
      );
      return withCORS(
        NextResponse.json(
          { message: "Missing wallet address" },
          { status: 400 }
        )
      );
    }
    if (!pool) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, MISSING_PARAMETER: pool`
      );
      return withCORS(
        NextResponse.json({ message: "Missing pool name" }, { status: 400 })
      );
    }

    const url = `https://api.vesu.xyz/positions?walletAddress=${address}&type=earn`;
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, FETCHING_POSITIONS: ${url}`
    );

    const response = await axios.get(url);
    const userPositions = response.data?.data || [];

    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, POSITIONS_FETCHED: ${
        userPositions.length
      } total positions`
    );

    const positions = userPositions.filter(
      (item: { pool: { name: string } }) => item.pool.name === pool
    );

    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, POSITIONS_FILTERED: ${
        positions.length
      } positions for pool "${pool}"`
    );

    if (!positions.length) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, NO_POSITIONS_FOUND: pool "${pool}"`
      );
      return withCORS(
        NextResponse.json({
          poolid: 0,
          total_supplied: 0,
        })
      );
    }

    const pos = positions[0];
    const totalSupplied =
      Number(pos.collateral.value) / 10 ** pos.collateral.decimals;

    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, POSITION_RETURNED: pool ID = ${
        pos.pool.id
      }, total supplied = ${totalSupplied}`
    );
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, FINISH.`
    );
    return withCORS(
      NextResponse.json({
        poolid: pos.pool.id,
        total_supplied: totalSupplied,
      })
    );
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/positions, ERROR: ${JSON.stringify(
        {
          message: error.message,
          stack: error.stack,
          response: error.response?.data || null,
        }
      )}`
    );
    return withCORS(
      NextResponse.json(
        { message: error.message || "Internal Server Error" },
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS(req: Request) {
  return withCORS(new NextResponse(null, { status: 204 }));
}
