import { Leaf, Search, BarChart3, TrendingUp, Target, Compass, Layers, Zap, Globe, Eye, Settings, Rocket } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FullResearchPipeline } from './tools/FullResearchPipeline';
import { ResearchLauncher } from './tools/ResearchLauncher';
import { ShareOfVoiceDashboard } from './tools/ShareOfVoiceDashboard';
import { KeywordRankTracker } from './tools/KeywordRankTracker';
import { KeywordExpansionTool } from './tools/KeywordExpansionTool';
import { HistoricalSearchVolume } from './tools/HistoricalSearchVolume';
import { KeywordRelevanceScoring } from './tools/KeywordRelevanceScoring';
import { CompetitorTracking } from './tools/CompetitorTracking';
import { PpcGapAnalysis } from './tools/PpcGapAnalysis';
import { ApiUsageQueue } from './tools/ApiUsageQueue';
import { ResearchSessions } from './tools/ResearchSessions';
import { KeywordGapAnalysis } from './tools/KeywordGapAnalysis';
import { JungleScoutWorkflowGuide } from './JungleScoutWorkflowGuide';


interface JungleScoutDashboardProps {
  accountName: string;
}

export const JungleScoutDashboard = ({ accountName }: JungleScoutDashboardProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <Leaf className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Jungle Scout</h2>
          <p className="text-xs text-muted-foreground">Keyword research & competitive intelligence</p>
        </div>
      </div>

      <JungleScoutWorkflowGuide />

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="full-pipeline" className="border rounded-lg px-4 border-primary/30 bg-primary/5">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="font-medium">Full Research Pipeline</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1">NEW</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FullResearchPipeline accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="research-launcher" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-green-600" />
              <span className="font-medium">Research Launcher</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ResearchLauncher accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="share-of-voice" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Share of Voice</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ShareOfVoiceDashboard accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="keyword-rank-tracker" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Keyword Rank Tracker</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <KeywordRankTracker accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="keyword-expansion" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Keyword Expansion</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <KeywordExpansionTool accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="keyword-gaps" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-600" />
              <span className="font-medium">Keyword Gap Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <KeywordGapAnalysis accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="competitor-tracking" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Competitor Tracking</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CompetitorTracking accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ppc-gap-analysis" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">PPC Gap Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PpcGapAnalysis accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="historical-volume" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-teal-600" />
              <span className="font-medium">Historical Search Volume</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <HistoricalSearchVolume accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="relevance-scoring" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-600" />
              <span className="font-medium">Keyword Relevance Scoring</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <KeywordRelevanceScoring accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-usage" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="font-medium">API Usage & Queue</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ApiUsageQueue accountName={accountName} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="research-sessions" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="font-medium">Research Sessions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ResearchSessions accountName={accountName} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
