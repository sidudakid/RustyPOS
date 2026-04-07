use crate::{
    errors::AppError,
    models::analytics::{AnalyticsSummary, MonthlyProfitLossPoint, MonthlyRevenuePoint, PeakHourPoint},
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

    let profit_rows: Vec<(String, i64, i64, i64, Option<f64>, i64)> = sqlx::query_as(
        "WITH revenue_by_month AS (
            SELECT
                DATE_TRUNC('month', o.created_at)::DATE AS month_start,
                TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS month,
                COALESCE(SUM((mi.price * oi.quantity)::BIGINT), 0)::BIGINT AS revenue,
                COALESCE(SUM((mi.estimated_cost * oi.quantity)::BIGINT), 0)::BIGINT AS direct_cost,
                COUNT(DISTINCT o.id)::BIGINT AS order_count
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN menu_items mi ON mi.id = oi.menu_item_id
            WHERE o.created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', o.created_at)
        )
        SELECT
            rbm.month,
            rbm.revenue,
            (rbm.direct_cost + COALESCE(me.rent + me.payroll + me.utilities + me.marketing + me.misc, 0))::BIGINT AS costs,
            (rbm.revenue - rbm.direct_cost - COALESCE(me.rent + me.payroll + me.utilities + me.marketing + me.misc, 0))::BIGINT AS profit,
            CASE
                WHEN rbm.revenue > 0 THEN ROUND((((rbm.revenue - rbm.direct_cost - COALESCE(me.rent + me.payroll + me.utilities + me.marketing + me.misc, 0))::NUMERIC / rbm.revenue::NUMERIC) * 100.0), 1)::FLOAT8
                ELSE NULL
            END AS margin_percent,
            rbm.order_count
        FROM revenue_by_month rbm
        LEFT JOIN monthly_expenses me ON me.month_start = rbm.month_start
        ORDER BY rbm.month_start DESC",
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
        monthly_profit_loss: profit_rows
            .into_iter()
            .map(|(month, revenue, costs, profit, margin_percent, order_count)| MonthlyProfitLossPoint {
                month,
                revenue,
                costs,
                profit,
                margin_percent,
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
