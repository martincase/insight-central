import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { format, parseISO } from 'date-fns';

interface HistoricalDataPoint {
  date: string;
  sales: number;
  unitsSold: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
}

interface ASINPerformanceChartProps {
  data: HistoricalDataPoint[];
  productName: string;
}

export const ASINPerformanceChart: React.FC<ASINPerformanceChartProps> = ({ data, productName }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No historical data available</p>
        </CardContent>
      </Card>
    );
  }

  // Format data for charts
  const chartData = data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMM dd, yyyy')
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{data.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'sales' ? formatCurrency(entry.value) :
                entry.dataKey === 'buyBoxPercentage' || entry.dataKey === 'conversionRate' ? 
                formatPercentage(entry.value) : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trends - Last 30 Days</CardTitle>
        <p className="text-sm text-muted-foreground">{productName}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales & Units</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="buybox">Buy Box</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate" 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="sales"
                  orientation="left"
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="units"
                  orientation="right"
                  tickFormatter={(value) => value.toLocaleString()}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  yAxisId="sales"
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Sales"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  yAxisId="units"
                  type="monotone" 
                  dataKey="unitsSold" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Units Sold"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="traffic" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate" 
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => value.toLocaleString()}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="pageViews" 
                  fill="#8b5cf6" 
                  name="Page Views"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="conversion" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate" 
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => formatPercentage(value)}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Conversion Rate"
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="buybox" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate" 
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => formatPercentage(value)}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="buyBoxPercentage" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Buy Box %"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};