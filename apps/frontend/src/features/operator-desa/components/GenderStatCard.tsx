import {
PieChart,
Pie,
Cell,
ResponsiveContainer,
} from "recharts";

// Warna untuk Laki-laki dan Perempuan
const COLOR_LAKI = "#2563eb";
const COLOR_PEREMPUAN = "#f472b6";

export default function GenderStatCard({
total,
laki,
perempuan,
}) {
const data = [
{
name: "Laki-laki",
value: laki,
fill: COLOR_LAKI,
},
{
name: "Perempuan",
value: perempuan,
fill: COLOR_PEREMPUAN,
},
];

// Custom Label untuk menampilkan persentase di dalam segmen Pie
const renderCustomizedLabel = ({
cx,
cy,
midAngle,
innerRadius,
outerRadius,
percent,
}) => {
if (percent === 0) return null;


const RADIAN = Math.PI / 180;
const radius =
  innerRadius + (outerRadius - innerRadius) * 0.5;

const x =
  cx + radius * Math.cos(-midAngle * RADIAN);

const y =
  cy + radius * Math.sin(-midAngle * RADIAN);

return (
  <text
    x={x}
    y={y}
    fill="white"
    textAnchor="middle"
    dominantBaseline="central"
    className="gender-stat-chart-label"
  >
    {`${(percent * 100).toFixed(0)}%`}
  </text>
);


};

return ( <div className="gender-stat-card">
{/* Container Utama */} <div className="gender-stat-content">


    {/* Total Warga + Pie Chart */}
    <div className="gender-stat-header">
      <div>
        <p className="gender-stat-label">
          Total Warga
        </p>

        <p className="gender-stat-total">
          {total.toLocaleString("id-ID")}
        </p>
      </div>

      {/* Pie Chart */}
      <div className="gender-stat-pie">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              outerRadius={26}
              innerRadius={0}
              stroke="none"
              startAngle={90}
              endAngle={450}
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.fill}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Detail Jenis Kelamin */}
    <div className="gender-stat-details">

      {/* Laki-laki */}
      <div className="gender-stat-item">
        <span
          className="gender-stat-dot gender-stat-dot-male"
          style={{
            backgroundColor: COLOR_LAKI,
          }}
        />

        <span>
          {laki.toLocaleString("id-ID")} Laki-laki
        </span>
      </div>

      {/* Perempuan */}
      <div className="gender-stat-item">
        <span
          className="gender-stat-dot gender-stat-dot-female"
          style={{
            backgroundColor: COLOR_PEREMPUAN,
          }}
        />

        <span>
          {perempuan.toLocaleString("id-ID")} Perempuan
        </span>
      </div>

    </div>
  </div>
</div>


);
}
