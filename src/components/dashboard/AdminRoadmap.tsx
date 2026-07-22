import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Calendar, Clock, CheckCircle2, Circle } from 'lucide-react';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  is_public: boolean;
  implemented: boolean;
  created_by: string | null;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminRoadmap = () => {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planned',
    priority: 'medium',
    is_public: false,
    implemented: false,
    estimated_completion: ''
  });

  useEffect(() => {
    fetchRoadmapItems();
  }, []);

  const fetchRoadmapItems = async () => {
    try {
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading roadmap items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const itemData = {
        ...formData,
        estimated_completion: formData.estimated_completion || null,
        created_by: 'admin'
      };

      if (editingItem) {
        const { error } = await supabase
          .from('roadmap_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "Roadmap item updated successfully" });
      } else {
        const { error } = await supabase
          .from('roadmap_items')
          .insert([itemData]);

        if (error) throw error;
        toast({ title: "Roadmap item created successfully" });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchRoadmapItems();
    } catch (error: any) {
      toast({
        title: `Error ${editingItem ? 'updating' : 'creating'} roadmap item`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority,
      is_public: item.is_public,
      implemented: item.implemented,
      estimated_completion: item.estimated_completion || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this roadmap item?')) return;

    try {
      const { error } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Roadmap item deleted successfully" });
      fetchRoadmapItems();
    } catch (error: any) {
      toast({
        title: "Error deleting roadmap item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePublic = async (item: RoadmapItem) => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .update({ is_public: !item.is_public })
        .eq('id', item.id);

      if (error) throw error;
      fetchRoadmapItems();
    } catch (error: any) {
      toast({
        title: "Error updating visibility",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleImplemented = async (item: RoadmapItem) => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .update({ implemented: !item.implemented })
        .eq('id', item.id);

      if (error) throw error;
      fetchRoadmapItems();
    } catch (error: any) {
      toast({
        title: "Error updating implementation status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'planned',
      priority: 'medium',
      is_public: false,
      implemented: false,
      estimated_completion: ''
    });
    setEditingItem(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
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

  if (isLoading) {
    return <div className="p-6">Loading roadmap...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Roadmap Management</h2>
          <p className="text-muted-foreground">Manage feature roadmap and public visibility</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Roadmap Item' : 'Add Roadmap Item'}</DialogTitle>
                <DialogDescription>
                  Create a new feature or update for the roadmap
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Feature title"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the feature"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="estimated_completion">Estimated Completion</Label>
                  <Input
                    id="estimated_completion"
                    type="date"
                    value={formData.estimated_completion}
                    onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_public: checked })}
                    />
                    <Label htmlFor="is_public">Make this item visible on public roadmap</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="implemented"
                      checked={formData.implemented}
                      onCheckedChange={(checked: boolean) => setFormData({ ...formData, implemented: checked })}
                    />
                    <Label htmlFor="implemented">Mark as implemented</Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Create'} Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                        {item.priority}
                      </Badge>
                      <Badge variant={item.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                        {item.status.replace('_', ' ')}
                      </Badge>
                      {item.created_by === 'ai' && (
                        <Badge variant="secondary" className="text-xs">AI Added</Badge>
                      )}
                      {item.implemented && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700">✅ Implemented</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={item.is_public}
                      onCheckedChange={() => togglePublic(item)}
                    />
                    <Label className="text-sm">Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={item.implemented}
                      onCheckedChange={() => toggleImplemented(item)}
                    />
                    <Label className="text-sm">Implemented</Label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {item.description && (
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
                {item.estimated_completion && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Est. completion: {new Date(item.estimated_completion).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
        
        {items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No roadmap items yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first roadmap item to get started
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};