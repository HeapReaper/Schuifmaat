FROM oven/bun:1.4.4

ENV TZ=Europe/Amsterdam \
  NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata openssl ca-certificates \
  && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
  && echo $TZ > /etc/timezone \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN chown -R bun:bun /app
USER bun

CMD ["bun", "run", "index.ts"]
