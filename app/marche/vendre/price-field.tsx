"use client";

import { useState } from "react";
import { formatNumber } from "@/components/game-ui";
import { MARKET_FEE_RATE, sellerReceives } from "@/lib/market-rules";

// Prix de vente, avec ce que le vendeur touchera après la taxe du marché
export function PriceField() {
  const [price, setPrice] = useState("");
  const value = Number(price);
  const rate = `${MARKET_FEE_RATE * 100} %`;
  return (
    <>
      <input name="price" type="number" min={1} max={100000} placeholder="Prix en pièces" value={price} onChange={(event) => setPrice(event.target.value)} />
      <small className="field-hint">
        {Number.isInteger(value) && value > 0
          ? `Tu recevras ${formatNumber(sellerReceives(value))} pièces (taxe du marché : ${rate}).`
          : `Le marché garde ${rate} du prix de vente.`}
      </small>
    </>
  );
}
