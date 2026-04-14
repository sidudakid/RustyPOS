//! Minimal websocket endpoint for broadcasting order lifecycle events.

use crate::{
    auth::{require_role_for_token, StaffRole},
    services::order_events::OrderEventMessage,
    AppState,
};
use serde_json::json;
use actix::{Actor, ActorContext, AsyncContext, StreamHandler};
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use tokio::sync::broadcast;

fn access_token_from_query(req: &HttpRequest) -> Option<String> {
    web::Query::<std::collections::HashMap<String, String>>::from_query(req.query_string())
        .ok()
        .and_then(|query| query.into_inner().remove("access_token"))
        .filter(|token| !token.trim().is_empty())
}

pub async fn orders_ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let token = access_token_from_query(&req)
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("missing websocket access token"))?;
    require_role_for_token(&token, &state, &[StaffRole::Owner, StaffRole::Staff, StaffRole::Kitchen])
        .await
        .map_err(|error| actix_web::error::ErrorUnauthorized(error.to_string()))?;

    let receiver = state.order_events.subscribe();
    ws::start(OrderEventsWs { receiver }, &req, stream)
}

struct OrderEventsWs {
    receiver: broadcast::Receiver<OrderEventMessage>,
}

impl Actor for OrderEventsWs {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        ctx.text(json!({ "type": "ws_connected" }).to_string());

        ctx.run_interval(std::time::Duration::from_millis(250), |actor, ctx| {
            loop {
                match actor.receiver.try_recv() {
                    Ok(msg) => {
                        if let Ok(text) = serde_json::to_string(&msg) {
                            ctx.text(text);
                        }
                    }
                    Err(broadcast::error::TryRecvError::Empty) => break,
                    Err(broadcast::error::TryRecvError::Lagged(_)) => continue,
                    Err(broadcast::error::TryRecvError::Closed) => {
                        ctx.stop();
                        break;
                    }
                }
            }
        });

        ctx.run_interval(std::time::Duration::from_secs(20), |_actor, ctx| {
            ctx.ping(b"keepalive");
        });
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for OrderEventsWs {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(bytes)) => ctx.pong(&bytes),
            Ok(ws::Message::Close(_)) => ctx.stop(),
            Ok(ws::Message::Text(_))
            | Ok(ws::Message::Binary(_))
            | Ok(ws::Message::Continuation(_))
            | Ok(ws::Message::Nop)
            | Ok(ws::Message::Pong(_)) => {}
            Err(_) => ctx.stop(),
        }
    }
}
