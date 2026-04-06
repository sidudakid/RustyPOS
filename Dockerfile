# syntax=docker/dockerfile:1

FROM rust:1.90-bookworm AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY tests ./tests

RUN cargo build --release

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/openclaw_cafe /usr/local/bin/openclaw_cafe

ENV HOST=0.0.0.0
ENV PORT=8081
ENV SEED_ON_STARTUP=false

EXPOSE 8081

CMD ["openclaw_cafe"]
