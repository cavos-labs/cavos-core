import { NextResponse } from "next/server";
import axios from "axios";
import { validateRequest, withCORS } from "../../../../../lib/authUtils";
import { VesuPool } from "../../../../../types/vesu";
import { formatVesuPool } from "../../../../../lib/utils";

export async function POST(req: Request) {
  console.log(
    `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy hit, START.`
  );

  const auth = validateRequest(req);
  if (!auth.valid) {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, UNAUTHORIZED.`
    );
    return auth.response;
  }

  try {
    const { poolName, assetSymbol } = await req.json();
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, REQUEST_RECEIVED: poolName="${poolName}", assetSymbol="${assetSymbol}"`
    );

    if (!poolName) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, MISSING_PARAMETER: poolName`
      );
      return withCORS(
        NextResponse.json(
          { message: "Missing required parameter: 'poolName'" },
          { status: 400 }
        )
      );
    }

    if (!assetSymbol) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, MISSING_PARAMETER: assetSymbol`
      );
      return withCORS(
        NextResponse.json(
          { message: "Missing required parameter: 'assetSymbol'" },
          { status: 400 }
        )
      );
    }

    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, FETCHING_POOLS.`
    );
    const response = await axios.get("https://api.vesu.xyz/pools");
    const allVesuPools: VesuPool[] = response.data?.data || [];
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, POOLS_FETCHED: ${
        allVesuPools.length
      } pools`
    );

    const verifiedPools = allVesuPools
      .filter((pool) => pool.isVerified)
      .map(formatVesuPool);
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, VERIFIED_POOLS: ${
        verifiedPools.length
      } pools`
    );

    const foundPool = verifiedPools.find((pool) => pool.name === poolName);

    if (!foundPool) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, POOL_NOT_FOUND: "${poolName}"`
      );
      return withCORS(
        NextResponse.json(
          { message: `Pool "${poolName}" not found` },
          { status: 404 }
        )
      );
    }

    const usdcAsset = foundPool.assets.find(
      (asset) => asset.symbol === assetSymbol
    );

    if (!usdcAsset) {
      console.log(
        `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, ASSET_NOT_FOUND: "${assetSymbol}" in pool "${poolName}"`
      );
      return withCORS(
        NextResponse.json(
          { message: `USDC asset not found in pool "${poolName}"` },
          { status: 404 }
        )
      );
    }

    const apy = Number(usdcAsset.apy || 0);
    const defiSpringApy = Number(usdcAsset.defiSpringApy || 0);
    const poolAPY = apy + defiSpringApy;

    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, APY_COMPUTED: pool="${poolName}", asset="${assetSymbol}", apy=${poolAPY}%`
    );
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, FINISH.`
    );

    return withCORS(
      NextResponse.json({
        poolAPY: poolAPY || 0,
      })
    );
  } catch (error: any) {
    console.log(
      `[${new Date().toISOString()}] [POST] /api/v1/vesu/pool/apy, ERROR: ${
        error.message || error
      }`
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
  console.log(
    `[${new Date().toISOString()}] [OPTIONS] /api/v1/vesu/pool/apy, PREFLIGHT_REQUEST.`
  );
  return withCORS(new NextResponse(null, { status: 204 }));
}
