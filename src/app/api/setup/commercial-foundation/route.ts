import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  COMMERCIAL_BUYER_SEGMENTS,
  COMMERCIAL_OFFERS,
  COMMERCIAL_SERVICE_LINES,
} from "@/lib/setup/commercial-foundation-seed";

type NamedRow = {
  id: string;
  name: string;
};

function getMissingByName<T extends { name: string }>(items: readonly T[], existingNames: Set<string>) {
  return items.filter((item) => !existingNames.has(item.name));
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: "Rudy McCormick",
      timezone: "America/Chicago",
    });

    const { data: existingServiceLinesData, error: serviceLineSelectError } = await supabase
      .from("service_lines")
      .select("id,name")
      .eq("user_id", user.id);

    if (serviceLineSelectError) {
      return NextResponse.json({ error: serviceLineSelectError.message }, { status: 400 });
    }

    const existingServiceLines = (existingServiceLinesData ?? []) as NamedRow[];
    const existingServiceNames = new Set(existingServiceLines.map((row) => row.name));
    const missingServiceLines = getMissingByName(
      COMMERCIAL_SERVICE_LINES,
      existingServiceNames
    );

    if (missingServiceLines.length > 0) {
      const { error: serviceLineInsertError } = await supabase
        .from("service_lines")
        .insert(
          missingServiceLines.map((serviceLine) => ({
            user_id: user.id,
            name: serviceLine.name,
            short_name: serviceLine.short_name,
            description: serviceLine.description,
            primary_outcome: serviceLine.primary_outcome,
            active: true,
            sort_order: serviceLine.sort_order,
          }))
        );

      if (serviceLineInsertError) {
        return NextResponse.json({ error: serviceLineInsertError.message }, { status: 400 });
      }
    }

    const { data: refreshedServiceLinesData, error: refreshedServiceLineError } = await supabase
      .from("service_lines")
      .select("id,name")
      .eq("user_id", user.id);

    if (refreshedServiceLineError) {
      return NextResponse.json({ error: refreshedServiceLineError.message }, { status: 400 });
    }

    const refreshedServiceLines = (refreshedServiceLinesData ?? []) as NamedRow[];
    const serviceLineIdByName = new Map(
      refreshedServiceLines.map((serviceLine) => [serviceLine.name, serviceLine.id])
    );

    const { data: existingBuyerSegmentsData, error: buyerSegmentSelectError } = await supabase
      .from("buyer_segments")
      .select("id,name")
      .eq("user_id", user.id);

    if (buyerSegmentSelectError) {
      return NextResponse.json({ error: buyerSegmentSelectError.message }, { status: 400 });
    }

    const existingBuyerSegmentNames = new Set(
      ((existingBuyerSegmentsData ?? []) as NamedRow[]).map((row) => row.name)
    );
    const missingBuyerSegments = getMissingByName(
      COMMERCIAL_BUYER_SEGMENTS,
      existingBuyerSegmentNames
    );

    if (missingBuyerSegments.length > 0) {
      const { error: buyerSegmentInsertError } = await supabase
        .from("buyer_segments")
        .insert(
          missingBuyerSegments.map((buyerSegment) => ({
            user_id: user.id,
            name: buyerSegment.name,
            description: buyerSegment.description,
            common_pains: buyerSegment.common_pains,
            desired_outcomes: buyerSegment.desired_outcomes,
            objections: buyerSegment.objections,
            active: true,
            sort_order: buyerSegment.sort_order,
          }))
        );

      if (buyerSegmentInsertError) {
        return NextResponse.json({ error: buyerSegmentInsertError.message }, { status: 400 });
      }
    }

    const { data: existingOffersData, error: offerSelectError } = await supabase
      .from("offers")
      .select("id,name")
      .eq("user_id", user.id);

    if (offerSelectError) {
      return NextResponse.json({ error: offerSelectError.message }, { status: 400 });
    }

    const existingOfferNames = new Set(
      ((existingOffersData ?? []) as NamedRow[]).map((row) => row.name)
    );
    const missingOffers = getMissingByName(COMMERCIAL_OFFERS, existingOfferNames);

    if (missingOffers.length > 0) {
      const { error: offerInsertError } = await supabase
        .from("offers")
        .insert(
          missingOffers.map((offer) => ({
            user_id: user.id,
            service_line_id: serviceLineIdByName.get(offer.service_line_name) ?? null,
            name: offer.name,
            description: offer.description,
            target_buyer_segments: [...offer.target_buyer_segments],
            offer_type: offer.offer_type,
            primary_cta: offer.primary_cta,
            outcome: offer.outcome,
            price_notes: offer.price_notes,
            active: true,
          }))
        );

      if (offerInsertError) {
        return NextResponse.json({ error: offerInsertError.message }, { status: 400 });
      }
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "commercial_foundation_seeded",
      title: "Commercial foundation seeded",
      description:
        "Service lines, buyer segments, and offers were populated for campaign dropdowns.",
      metadata: {
        serviceLinesAdded: missingServiceLines.length,
        buyerSegmentsAdded: missingBuyerSegments.length,
        offersAdded: missingOffers.length,
      },
    });

    return NextResponse.json({
      ok: true,
      added: {
        serviceLines: missingServiceLines.length,
        buyerSegments: missingBuyerSegments.length,
        offers: missingOffers.length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error seeding commercial foundation." },
      { status: 500 }
    );
  }
}
