#[test]
fn smoke_test_placeholder() {
    assert_eq!(2 + 2, 4);
}

#[test]
fn token_examples_are_non_empty() {
    let tokens = ["table-1-qr", "table-2-nfc", "window-bar-qr"];
    assert!(tokens.iter().all(|token| !token.is_empty()));
}
