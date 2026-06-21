import { explorerAddressUrl, shortHash } from "../lib/explorer";

/**
 * Renders a human-friendly alias when one exists, otherwise the abbreviated
 * address. Always links to the block explorer so raw wallets are never dead text.
 */
export function AddressDisplay({
  address,
  alias,
  link = true,
}: {
  address: string;
  alias?: string | null;
  link?: boolean;
}) {
  const label = alias?.trim() ? alias.trim() : shortHash(address);
  const content = (
    <span className="addr" title={address}>
      {alias?.trim() ? (
        <>
          <span className="addr-alias">{label}</span>
          <span className="addr-mono">{shortHash(address)}</span>
        </>
      ) : (
        <span className="addr-mono">{label}</span>
      )}
    </span>
  );

  if (!link) {
    return content;
  }

  return (
    <a className="addr-link" href={explorerAddressUrl(address)} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}
