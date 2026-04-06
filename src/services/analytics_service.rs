use crate::{
    errors::AppError,
    models::analytics::{AnalyticsSummary, MonthlyRevenuePoint, PeakHourPoint},
};
use sqlx::PgPool;

pub async fn analytics_summary(pool: &PgPool) -> Result<AnalyticsSummary, AppError> {
    let monthly_rows: Vec<(String, i64, i64)> = sqlx::query_as(
        "SELECT
            TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS month,
            COALESCE(SUM((mi.price * oi.quantity)::BIGINT), 0)::BIGINT AS revenue,
            COUNT(DISTINCT o.id)::BIGINT AS order_count
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE o.created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', o.created_at)
         ORDER BY DATE_TRUNC('month', o.created_at) DESC",
    )
    .fetch_all(pool)
    .await?;

    let peak_rows: Vec<(i32, i64, i64)> = sqlx::query_as(
        "SELECT
            EXTRACT(HOUR FROM o.created_at)::INT4 AS hour,
            COUNT(DISTINCT o.id)::BIGINT AS order_count,
            COALESCE(SUM((mi.price * oi.quantity)::BIGINT), 0)::BIGINT AS revenue
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         GROUP BY EXTRACT(HOUR FROM o.created_at)
         ORDER BY order_count DESC, revenue DESC
         LIMIT 5",
    )
    .fetch_all(pool)
    .await?;

    Ok(AnalyticsSummary {
        monthly_revenue: monthly_rows
            .into_iter()
            .map(|(month, revenue, order_count)| MonthlyRevenuePoint {
                month,
                revenue,
                order_count,
            })
            .collect(),
        peak_hours: peak_rows
            .into_iter()
            .map(|(hour, order_count, revenue)| PeakHourPoint {
                hour,
                order_count,
                revenue,
            })
            .collect(),
    })
}
