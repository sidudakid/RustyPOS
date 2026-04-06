use serde_json::json;

#[test]
fn health_contract_shape() {
    let body = json!({ "status": "ok" });
    assert_eq!(body["status"], "ok");
}

#[test]
fn token_order_contract_shape() {
    let body = json!({
        "token": "table-1-qr",
        "items": [
            {
                "menu_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
                "quantity": 1
            }
        ]
    });

    assert_eq!(body["token"], "table-1-qr");
    assert_eq!(body["items"][0]["quantity"], 1);
}
