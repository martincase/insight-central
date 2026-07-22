
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface SalesSparklineProps {
  merchantToken: string;
  sheetData: any[];
}

export const SalesSparkline = ({ merchantToken, sheetData }: SalesSparklineProps) => {
  // Generate the last 7 days for the sparkline - exclude today, end with yesterday
  const yesterday = subDays(new Date(), 1);
  const startDate = subDays(yesterday, 6);
  const dateRange = eachDayOfInterval({ start: startDate, end: yesterday });

  // Process data for the sparkline
  const sparklineData = dateRange.map(date => {
    const dateStr = format(date, 'dd/MM/yyyy');
    let sales = 0;

    // Calculate sales for this date and account
    if (sheetData.length > 0) {
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowDateStr = row[1]; // Column B
        const accountId = row[4]; // Column E
        const salesAmount = parseFloat(row[5] || '0'); // Column F

        if (rowDateStr === dateStr && accountId === merchantToken && !isNaN(salesAmount)) {
          sales += salesAmount;
        }
      }
    }

    return {
      date: dateStr,
      sales: sales
    };
  });

  // Determine trend color based on overall direction
  const firstValue = sparklineData[0]?.sales || 0;
  const lastValue = sparklineData[sparklineData.length - 1]?.sales || 0;
  const isUpward = lastValue >= firstValue;

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line
            type="monotone"
            dataKey="sales"
            stroke={isUpward ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
