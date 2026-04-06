use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyRevenuePoint {
    pub month: String,
    pub revenue: i64,
    pub order_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeakHourPoint {
    pub hour: i32,
    pub order_count: i64,
    pub revenue: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSummary {
    pub monthly_revenue: Vec<MonthlyRevenuePoint>,
    pub peak_hours: Vec<PeakHourPoint>,
}
