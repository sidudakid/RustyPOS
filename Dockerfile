# syntax=docker/dockerfile:1

FROM node:22-bookworm AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM rust:1.90-bookworm AS backend-builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY tests ./tests
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser

COPY --from=backend-builder /app/target/release/openclaw_cafe /usr/local/bin/openclaw_cafe
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV HOST=0.0.0.0
ENV PORT=8081
ENV SEED_ON_STARTUP=false
ENV RUST_LOG=info

EXPOSE 8081
USER appuser

CMD ["openclaw_cafe"]
