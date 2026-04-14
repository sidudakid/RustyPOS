//! Minimal websocket endpoint for broadcasting order lifecycle events.

use crate::{services::order_events::OrderEventMessage, AppState};
use serde_json::json;
use actix::{Actor, ActorContext, AsyncContext, StreamHandler};
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use tokio::sync::broadcast;

pub async fn orders_ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
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
