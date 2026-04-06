//! Simple bearer-token middleware for kitchen/admin endpoints.

use crate::errors::AppError;
use actix_service::{forward_ready, Service, Transform};
use actix_web::{
    body::EitherBody,
    dev::{ServiceRequest, ServiceResponse},
    http::header,
    Error, ResponseError,
};
use futures_util::future::{ok, LocalBoxFuture, Ready};
use std::rc::Rc;

#[derive(Clone)]
pub struct AdminAuth {
    expected_token: String,
}

impl AdminAuth {
    pub fn new(expected_token: String) -> Self {
        Self { expected_token }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AdminAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = AdminAuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AdminAuthMiddleware {
            service: Rc::new(service),
            expected_token: self.expected_token.clone(),
        })
    }
}

pub struct AdminAuthMiddleware<S> {
    service: Rc<S>,
    expected_token: String,
}

impl<S, B> Service<ServiceRequest> for AdminAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let expected_token = self.expected_token.clone();

        Box::pin(async move {
            let authorized = req
                .headers()
                .get(header::AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer "))
                .map(|token| token == expected_token)
                .unwrap_or(false);

            if !authorized {
                let response = AppError::Unauthorized("missing or invalid bearer token".into())
                    .error_response()
                    .map_into_right_body();
                return Ok(req.into_response(response));
            }

            let res = service.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}
