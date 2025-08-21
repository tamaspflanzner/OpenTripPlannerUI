FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /ui
 
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

RUN git clone https://github.com/opentripplanner/otp-react-redux.git ./

RUN yarn install

COPY example-config.yml /ui/example/example-config.yml

COPY vite.config.js /ui/vite.config.js

ENV HOST=0.0.0.0
ENV PORT=9966

ENV YAML_CONFIG=/ui/example/example-config.yml

EXPOSE 9966
CMD ["yarn","start"]
#CMD ["sh","-c","yarn build && yarn preview --host 0.0.0.0 --port 9966 --strictPort"]