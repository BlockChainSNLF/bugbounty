"use client";

import { useEffect, useState } from "react";

import { getConnectedChainId, switchToChain } from "../lib/wallet";

const requiredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

export function ChainGuard() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getConnectedChainId()
      .then(setChainId)
      .catch(() => undefined);
  }, []);

  if (chainId === null || chainId === requiredChainId) {
    return null;
  }

  return (
    <div className="panel actions">
      <p className="danger">
        Tu cuenta está conectada a una red distinta de la requerida para operar en esta plataforma.
      </p>
      <button
        onClick={async () => {
          try {
            setError(null);
            await switchToChain(requiredChainId);
            setChainId(requiredChainId);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "No se pudo cambiar de red");
          }
        }}
      >
        Cambiar de red
      </button>
      {error ? <p className="danger">{error}</p> : null}
    </div>
  );
}
