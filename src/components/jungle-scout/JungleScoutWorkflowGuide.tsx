import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Search, BarChart3, TrendingUp, Layers, Target, Eye, Compass, Zap, Globe, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: 1,
    title: 'Research Launcher',
    icon: Search,
    color: 'text-green-600 bg-green-100',
    description: 'Start here. Enter a seed keyword (e.g. "hard floor cleaner"), select marketplace, optionally enter your ASIN. Click Launch Research to create a research session and automatically fetch keyword data.',
    independent: true,
  },
  {
    number: 2,
    title: 'Share of Voice',
    icon: BarChart3,
    color: 'text-blue-600 bg-blue-100',
    description: 'View which brands dominate the search results for your keyword. See brand market share percentages and top ASINs.',
    independent: true,
  },
  {
    number: 3,
    title: 'Keyword Rank Tracker',
    icon: TrendingUp,
    color: 'text-purple-600 bg-purple-100',
    description: 'Enter your ASIN(s) to see which keywords they rank for. Shows organic rank, sponsored rank, search volume, PPC bids and ease of ranking.',
    independent: true,
  },
  {
    number: 4,
    title: 'Keyword Expansion',
    icon: Layers,
    color: 'text-orange-600 bg-orange-100',
    description: 'Find related keywords. Enter a seed keyword to discover additional keyword opportunities with search volumes and categories.',
    independent: true,
  },
  {
    number: 5,
    title: 'Keyword Gap Analysis',
    icon: Target,
    color: 'text-red-600 bg-red-100',
    description: 'Compare your ASIN vs a competitor ASIN to find keywords they rank for that you don\'t. Requires Keyword Rank Tracker data first.',
    dependency: 'Step 3',
  },
  {
    number: 6,
    title: 'Competitor Tracking',
    icon: Eye,
    color: 'text-indigo-600 bg-indigo-100',
    description: 'Monitor competitor brands, their products, prices, and market share. Toggle tracking for specific brands.',
    independent: true,
  },
  {
    number: 7,
    title: 'Keyword Relevance Scoring',
    icon: Compass,
    color: 'text-cyan-600 bg-cyan-100',
    description: 'AI-powered scoring of keywords for relevance to your product. Requires keyword data from steps 3–4. Enter a product description and click Score Keywords.',
    dependency: 'Steps 3–4',
  },
  {
    number: 8,
    title: 'PPC Gap Analysis',
    icon: Zap,
    color: 'text-yellow-600 bg-yellow-100',
    description: 'Find gaps between your scored keywords and current PPC campaigns. Requires Keyword Relevance Scoring (step 7) to be completed first.',
    dependency: 'Step 7',
  },
  {
    number: 9,
    title: 'Historical Search Volume',
    icon: Globe,
    color: 'text-teal-600 bg-teal-100',
    description: 'Look up search volume trends over time for any keyword.',
    independent: true,
  },
];

export const JungleScoutWorkflowGuide = () => {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem('section_js_workflow_guide');
    return stored === 'true';
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem('section_js_workflow_guide', String(next));
  };

  return (
    <div className="border rounded-lg bg-card mb-4 overflow-hidden">
      <button
        onClick={toggle}
        className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <BookOpen className="h-5 w-5 text-green-600 shrink-0" />
        <span className="font-semibold text-foreground">How to Use Jungle Scout Tools — Workflow Guide</span>
      </button>

      {open && (
        <div className="px-4 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Dependency note */}
          <div className="flex items-start gap-2 mb-4 p-3 rounded-md bg-muted/60 border border-border text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
            <span>
              <strong className="text-foreground">Tip:</strong> Steps 1–4 &amp; 6 can run independently. Steps 5, 7, and 8 depend on earlier steps (noted below).
            </span>
          </div>

          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="flex items-start gap-3">
                  {/* Step number circle */}
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0',
                    step.color
                  )}>
                    {step.number}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{step.title}</span>
                      {step.dependency && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          Requires {step.dependency}
                        </span>
                      )}
                      {step.independent && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                          Independent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
