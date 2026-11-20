FROM oven/bun:1.4.4

ENV TZ=Europe/Amsterdam \
  NODE_ENV=production \
  API_PORT=3144

RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata openssl ca-certificates \
  && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
  && echo $TZ > /etc/timezone \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first, so code changes reuse this layer
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN chown -R bun:bun /app
USER bun

EXPOSE 3144

# Exec form: bun is PID 1 and receives SIGTERM, so main.ts shuts down cleanly
CMD ["bun", "run", "main.ts"]
