import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RoadmapFloatingButton = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button 
        asChild
        size="lg"
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full h-14 w-14 p-0"
        title="View Product Roadmap"
      >
        <Link to="/roadmap">
          <Map className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
};