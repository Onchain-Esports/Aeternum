import { apiRequest } from "@/services/api";
import type { Property } from "@/types";

type BackendMarket = {
  id: string;
  matchId: string;
  contractAddr: string;
  liquidityPool: number;
  supplyA: number;
  supplyB: number;
  basePrice: number;
  curveK: number;
  status: string;
  createdAt: string;
  match: {
    id: string;
    teamAId: string;
    teamBId: string;
    tournament: string;
    startTime: string;
    status: string;
    result: string | null;
    createdAt: string;
    teamA: {
      id: string;
      name: string;
      game: string;
      region: string;
      logoUrl: string | null;
      createdAt: string;
    };
    teamB: {
      id: string;
      name: string;
      game: string;
      region: string;
      logoUrl: string | null;
      createdAt: string;
    };
  };
  teamAPrice: number;
  teamBPrice: number;
};

type MarketsResponse = {
  message: string;
  data: BackendMarket[];
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80";

function mapMarketStatus(status: string): Property["status"] {
  const s = status?.toUpperCase();
  if (s === "OPEN") return "active";
  if (s === "SCHEDULED") return "pending";
  return "sold_out";
}

function mapMarket(m: BackendMarket): Property {
  const avgPrice = (m.teamAPrice + m.teamBPrice) / 2;
  const images = [m.match.teamA.logoUrl, m.match.teamB.logoUrl].filter(
    (u): u is string => !!u,
  );
  const primaryImage = images[0] ?? FALLBACK_IMAGE;

  return {
    id: m.id,
    name: `${m.match.teamA.name} vs ${m.match.teamB.name}`,
    location: m.match.tournament,
    city: m.match.teamA.game,
    country: m.match.teamA.region,
    // type is a placeholder — explore screen filters by status instead of type
    type: "Residential",
    image: primaryImage,
    images,
    description: `${m.match.teamA.name} vs ${m.match.teamB.name} — ${m.match.tournament}`,
    totalValuation: m.liquidityPool,
    tokenizedAmount: m.liquidityPool,
    pricePerShare: +avgPrice.toFixed(4),
    totalShares: m.supplyA + m.supplyB,
    availableShares: m.supplyA + m.supplyB,
    yieldPercent: +(m.curveK * 100).toFixed(2),
    monthlyRental: 0,
    operatingCosts: 0,
    managementFeePercent: 0,
    insuranceCost: 0,
    capRate: 0,
    occupancy: 100,
    totalInvestors: 0,
    status: mapMarketStatus(m.status),
    isFeatured: false,
  };
}

export async function fetchMarkets(): Promise<Property[]> {
  const response = await apiRequest<MarketsResponse>("/api/markets", {
    method: "GET",
    requiresAuth: false,
  });

  return (response.data ?? [])
    .filter(
      (m): m is BackendMarket =>
        !!m && typeof m === "object" && typeof m.id === "string",
    )
    .map(mapMarket);
}
