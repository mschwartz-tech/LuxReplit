import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ProgressChartProps {
  data: Array<{
    progressDate: Date;
    measurements: {
      chest?: number;
      waist?: number;
      hips?: number;
      thighs?: number;
      arms?: number;
    };
    weight: string;
    bodyFatPercentage?: string;
  }>;
  metric: 'measurements' | 'weight' | 'bodyFat';
  title: string;
  description?: string;
  comparisonDate?: Date;
  className?: string;
}

const MEASUREMENT_COLORS = {
  chest: "#2563eb",
  waist: "#16a34a",
  hips: "#dc2626",
  thighs: "#9333ea",
  arms: "#c2410c"
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(2)} {entry.unit || ''}
        </p>
      ))}
    </div>
  );
};

export function ProgressChart({ 
  data, 
  metric, 
  title, 
  description, 
  comparisonDate, 
  className 
}: ProgressChartProps) {
  const transformedData = data.map(record => ({
    date: format(new Date(record.progressDate), 'MMM d'),
    rawDate: new Date(record.progressDate),
    ...record.measurements,
    weight: parseFloat(record.weight),
    bodyFat: record.bodyFatPercentage ? parseFloat(record.bodyFatPercentage) : undefined
  }));

  // Sort data by date
  transformedData.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  // Calculate averages for reference lines
  const calculateAverage = (dataKey: string) => {
    const values = transformedData
      .map(item => item[dataKey])
      .filter((val): val is number => val !== undefined);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
  };

  // Get comparison data if comparisonDate is provided
  const comparisonData = comparisonDate ? 
    transformedData.find(d => 
      d.rawDate.getTime() >= comparisonDate.getTime() && 
      d.rawDate.getTime() < subDays(comparisonDate, -1).getTime()
    ) : undefined;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={transformedData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
              <YAxis 
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
                label={{ 
                  value: metric === 'weight' ? 'Weight (kg)' : 
                         metric === 'bodyFat' ? 'Body Fat %' : 
                         'Measurements (cm)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'currentColor'
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {metric === 'measurements' ? (
                Object.entries(MEASUREMENT_COLORS).map(([key, color]) => {
                  const average = calculateAverage(key);
                  return (
                    <React.Fragment key={key}>
                      <Line
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        name={key.charAt(0).toUpperCase() + key.slice(1)}
                        connectNulls
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                      />
                      {average && (
                        <ReferenceLine 
                          y={average} 
                          stroke={color} 
                          strokeDasharray="3 3"
                          label={{ 
                            value: `Avg ${key}`, 
                            fill: color,
                            position: 'right'
                          }} 
                        />
                      )}
                    </React.Fragment>
                  );
                })
              ) : metric === 'weight' ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#2563eb" 
                    name="Weight" 
                    unit="kg"
                    connectNulls
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                  {calculateAverage('weight') && (
                    <ReferenceLine 
                      y={calculateAverage('weight')} 
                      stroke="#2563eb" 
                      strokeDasharray="3 3"
                      label={{ value: 'Avg weight', fill: '#2563eb', position: 'right' }} 
                    />
                  )}
                </>
              ) : (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="bodyFat" 
                    stroke="#dc2626" 
                    name="Body Fat" 
                    unit="%"
                    connectNulls
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                  {calculateAverage('bodyFat') && (
                    <ReferenceLine 
                      y={calculateAverage('bodyFat')} 
                      stroke="#dc2626" 
                      strokeDasharray="3 3"
                      label={{ value: 'Avg body fat', fill: '#dc2626', position: 'right' }} 
                    />
                  )}
                </>
              )}

              {/* Add comparison line if comparison date is provided */}
              {comparisonData && (
                <ReferenceLine 
                  x={format(comparisonDate, 'MMM d')}
                  stroke="#6b7280"
                  label={{ value: 'Comparison', angle: -90, position: 'top' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}