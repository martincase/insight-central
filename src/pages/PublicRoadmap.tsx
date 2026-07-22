import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Circle, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/dashboard/AppHeader';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
  implemented: boolean;
}

export default function PublicRoadmap() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPublicRoadmapItems();
  }, []);

  const fetchPublicRoadmapItems = async () => {
    try {
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .eq('is_public', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching roadmap items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const groupedItems = {
    completed: items.filter(item => item.status === 'completed'),
    in_progress: items.filter(item => item.status === 'in_progress'),
    planned: items.filter(item => item.status === 'planned'),
    implemented: items.filter(item => item.implemented === true)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">Loading roadmap...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-6 py-8">
        <AppHeader 
          logoSrc="/uploads/5c667651-2969-4788-b15c-e3710a58d0b7.png"
          title="Product Roadmap"
          subtitle="See what we're working on and what's coming next"
          features="Live Updates • Transparent Development • Community Driven"
        >
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </AppHeader>

        {items.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No public roadmap items yet</h3>
                <p className="text-muted-foreground">
                  Check back soon for updates on upcoming features and improvements
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {/* Implemented Section */}
            {groupedItems.implemented.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <h2 className="text-2xl font-semibold">Implemented</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedItems.implemented.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-emerald-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  Implemented
                                </Badge>
                                <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                                  {item.priority} priority
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {item.description && (
                        <CardContent>
                          <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* In Progress Section */}
            {groupedItems.in_progress.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-6 w-6 text-blue-500" />
                  <h2 className="text-2xl font-semibold">Currently Working On</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedItems.in_progress.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(item.status)}
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                                  {item.priority} priority
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {item.description && (
                        <CardContent>
                          <p className="text-muted-foreground mb-3">{item.description}</p>
                          {item.estimated_completion && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Est. completion: {new Date(item.estimated_completion).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Planned Section */}
            {groupedItems.planned.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Circle className="h-6 w-6 text-gray-400" />
                  <h2 className="text-2xl font-semibold">Coming Soon</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedItems.planned.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-gray-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(item.status)}
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                                  {item.priority} priority
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {item.description && (
                        <CardContent>
                          <p className="text-muted-foreground mb-3">{item.description}</p>
                          {item.estimated_completion && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Est. completion: {new Date(item.estimated_completion).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {groupedItems.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <h2 className="text-2xl font-semibold">Recently Completed</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedItems.completed.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-green-500 opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(item.status)}
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {item.description && (
                        <CardContent>
                          <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <footer className="text-center mt-16 pt-8 border-t">
          <p className="text-muted-foreground">
            Have suggestions? We'd love to hear from you!
          </p>
        </footer>
      </div>
    </div>
  );
}