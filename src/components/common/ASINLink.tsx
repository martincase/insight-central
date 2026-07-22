import { Link } from 'react-router-dom';

/** Clickable ASIN badge that links to /asin/:asin */
export const ASINLink = ({ asin, className = '' }: { asin: string; className?: string }) => {
  if (!asin) return null;
  return (
    <Link
      to={`/asin/${asin}`}
      className={`font-mono text-blue-600 hover:text-blue-500 hover:underline cursor-pointer ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {asin}
    </Link>
  );
};
