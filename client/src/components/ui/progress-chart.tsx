import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

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
}

const MEASUREMENT_COLORS = {
  chest: "#2563eb",
  waist: "#16a34a",
  hips: "#dc2626",
  thighs: "#9333ea",
  arms: "#c2410c"
};

export function ProgressChart({ data, metric, title, description }: ProgressChartProps) {
  const transformedData = data.map(record => ({
    date: format(new Date(record.progressDate), 'MMM d'),
    ...record.measurements,
    weight: parseFloat(record.weight),
    bodyFat: record.bodyFatPercentage ? parseFloat(record.bodyFatPercentage) : undefined
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transformedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {metric === 'measurements' ? (
                Object.entries(MEASUREMENT_COLORS).map(([key, color]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    connectNulls
                  />
                ))
              ) : metric === 'weight' ? (
                <Line type="monotone" dataKey="weight" stroke="#2563eb" name="Weight (kg)" connectNulls />
              ) : (
                <Line type="monotone" dataKey="bodyFat" stroke="#dc2626" name="Body Fat %" connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
