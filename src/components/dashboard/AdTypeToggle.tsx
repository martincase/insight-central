
import type { AdType } from '@/hooks/useApiPpcData';

interface AdTypeToggleProps {
  value: AdType;
  onChange: (value: AdType) => void;
}

const options: { value: AdType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sp', label: 'SP' },
  { value: 'sb', label: 'SB' },
  { value: 'sd', label: 'SD' },
];

export const AdTypeToggle = ({ value, onChange }: AdTypeToggleProps) => {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
