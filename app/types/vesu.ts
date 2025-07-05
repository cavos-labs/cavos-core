export interface VesuPosition {
  type: string;
  pool: { id: string; name: string };
  collateral: {
    usdPrice: any;
    symbol: string;
    value: string;
    decimals: number;
  };
}

export interface VesuEarnPosition {
  poolId: string;
  pool: string;
  total_supplied: number;
  poolApy: number;
}

export interface VesuAsset {
  name: string;
  symbol: string;
  currentUtilization: number;
  apy: number;
  defiSpringApy: number;
  decimals: number;
  address: string;
  vToken: vToken;
  stats: VesuStat;
}
export interface vToken {
  address: string;
}

export interface VesuStat {
  currentUtilization: CurrentUtilization;
  defiSpringSupplyApr: DefiSpringSupplyApr;
  supplyApy: SupplyApy;
}
export interface SupplyApy {
  value: string;
  decimals: number;
}
export interface DefiSpringSupplyApr {
  value: string;
  decimals: number;
}

export interface CurrentUtilization {
  value: string;
  decimals: number;
}

export interface VesuPool {
  id: string;
  name: string;
  address: string;
  assets: VesuAsset[];
  extensionContractAddress: string;
  isVerified: boolean;
}
