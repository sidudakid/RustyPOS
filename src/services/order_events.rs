//! In-memory event broadcaster for websocket subscribers.

use crate::models::order::OrderStatus;
use serde::Serialize;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OrderEventMessage {
    NewOrder {
        order_id: Uuid,
        table_id: Uuid,
        status: OrderStatus,
    },
    OrderStatusUpdated {
        order_id: Uuid,
        status: OrderStatus,
    },
}

pub struct OrderEventBroker {
    sender: broadcast::Sender<OrderEventMessage>,
}

impl OrderEventBroker {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(100);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OrderEventMessage> {
        self.sender.subscribe()
    }

    pub fn send(&self, event: OrderEventMessage) {
        let _ = self.sender.send(event);
    }
}
