mod auth;
mod controllers;
mod db;
mod errors;
mod middleware;
mod models;
mod routes;
mod services;
mod ws;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use db::{init_pool, run_migrations, seed_if_empty};
use services::order_events::OrderEventBroker;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub order_events: Arc<OrderEventBroker>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql:///openclaw_cafe".to_string());

    let db = init_pool(&database_url)
        .await
        .expect("failed to connect to database");
    run_migrations(&db)
        .await
        .expect("failed to run migrations");

    let seed_on_startup = std::env::var("SEED_ON_STARTUP")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(true);

    if seed_on_startup {
        seed_if_empty(&db)
            .await
            .expect("failed to seed database");
    }

    controllers::operator_auth::ensure_operator_credentials(&db)
        .await
        .expect("failed to ensure operator credentials");

    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8081);

    let state = AppState {
        db,
        order_events: Arc::new(OrderEventBroker::new()),
    };

    let cors_allowed_origins = std::env::var("CORS_ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.81:5173".to_string());
    let cors_origins: Vec<String> = cors_allowed_origins
        .split(',')
        .map(|origin| origin.trim().to_string())
        .filter(|origin| !origin.is_empty())
        .collect();

    HttpServer::new(move || {
        let mut cors = Cors::default()
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "OPTIONS"])
            .allowed_headers(vec![actix_web::http::header::AUTHORIZATION, actix_web::http::header::CONTENT_TYPE])
            .supports_credentials();

        for origin in &cors_origins {
            cors = cors.allowed_origin(origin);
        }

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(web::Data::new(state.clone()))
            .configure(routes::configure)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
